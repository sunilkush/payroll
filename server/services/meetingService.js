import { Types } from 'mongoose';
import { Client } from '../models/Client.js';
import { Company } from '../models/Company.js';
import { Meeting } from '../models/Meeting.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { MEETING_EVENTS, MEETING_OPEN_STATUSES, MEETING_STATUS, ROLES } from '../utils/constants.js';
import { zonedTime } from '../utils/dateUtil.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getTenantId } from '../utils/tenantContext.js';
import { buildQr, meetingToken, qrExpiry } from './qrService.js';

// companyId yahan kahin nahi likha: tenantPlugin har query ko current company tak limit karta hai.

const POPULATE = [
  { path: 'clientId', select: 'name contactPerson phone address isActive' },
  { path: 'salesManagerId', select: 'name employeeCode phone isActive' },
];

const fieldError = (field, message, status = 400) => new ApiError(status, message, [{ field, message }]);

// Staff (sales manager) ko sirf apni meetings dikhti hain.
const scopeFor = (requester) => (requester.role === ROLES.STAFF ? { salesManagerId: requester._id } : {});

// ---------- Create / update ke checks ----------

async function activeClientOrThrow(clientId) {
  const client = await Client.findOne({ _id: clientId, isActive: true });
  if (!client) throw fieldError('clientId', 'Choose an active client.');
  return client;
}

async function assertSalesManager(salesManagerId) {
  const ok = await User.exists({ _id: salesManagerId, role: ROLES.STAFF, isSalesManager: true, isActive: true });
  if (!ok) throw fieldError('salesManagerId', 'Choose an active sales manager.');
}

// App timezone ki date + 'HH:mm' -> asli waqt.
function toSchedule(date, startTime, endTime) {
  const startAt = zonedTime(date, startTime);
  const endAt = zonedTime(date, endTime);
  if (endAt <= startAt) throw fieldError('endTime', 'End time must be after start time.');
  if (endAt <= new Date()) throw fieldError('date', 'This meeting time has already passed.');
  return { date, startAt, endAt };
}

// Ek sales manager ek hi waqt mein do jagah nahi ho sakta.
async function assertNoClash({ salesManagerId, startAt, endAt }, exceptId) {
  const clash = await Meeting.findOne({
    _id: { $ne: exceptId },
    salesManagerId,
    status: { $in: [...MEETING_OPEN_STATUSES, MEETING_STATUS.CHECKED_IN] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).select('title');
  if (clash) {
    throw fieldError('salesManagerId', `This sales manager already has a meeting at that time ("${clash.title}").`, 409);
  }
}

// lat/lng na diye hon to client ki saved location.
function resolveLocation(location, client) {
  const lat = location.lat ?? client.lat;
  const lng = location.lng ?? client.lng;
  if (lat == null || lng == null) {
    throw fieldError('location.lat', 'Set the meeting location on the map (this client has no saved location).');
  }
  return {
    name: location.name || client.name,
    address: location.address || client.address,
    lat,
    lng,
    radius: location.radius,
  };
}

// Check-in kitne minute pehle / baad tak ho sakta hai (company ki setting). QR bhi tabhi tak chalta hai.
async function checkInGrace() {
  const company = await Company.findById(getTenantId()).select('settings.meetingCheckInGraceMin');
  if (!company) throw new ApiError(404, 'Company not found.');
  return company.settings.meetingCheckInGraceMin;
}

// ---------- Create ----------

export async function createMeeting(admin, body) {
  const { clientId, salesManagerId, date, startTime, endTime, location, ...rest } = body;
  const client = await activeClientOrThrow(clientId);
  await assertSalesManager(salesManagerId);
  const schedule = toSchedule(date, startTime, endTime);
  await assertNoClash({ salesManagerId, ...schedule });

  const meeting = new Meeting({
    ...rest,
    clientId,
    salesManagerId,
    // Is meeting ka contact na diya ho to client ka default
    contactPerson: rest.contactPerson || client.contactPerson,
    contactPhone: rest.contactPhone || client.phone,
    ...schedule,
    location: resolveLocation(location, client),
    createdBy: admin._id,
    events: [
      { type: MEETING_EVENTS.CREATED, by: admin._id },
      { type: MEETING_EVENTS.QR_GENERATED, by: admin._id },
    ],
  });
  // QR meeting ke saath hi banta hai (token meeting ke _id se nikalta hai, isliye save se pehle).
  meeting.qr = buildQr(meeting._id, 1, schedule.endAt, await checkInGrace());
  await meeting.save();
  return meeting.populate(POPULATE);
}

// ---------- Read ----------

export async function getMeeting(id, requester) {
  const meeting = await Meeting.findOne({ _id: id, ...scopeFor(requester) })
    .populate(POPULATE)
    .populate('events.by', 'name');
  if (!meeting) throw new ApiError(404, 'Meeting not found.');
  return meeting;
}

// Staff: sirf apni. Admin: company ki saari, filters ke saath.
export async function listMeetings({
  requester,
  search,
  status,
  from,
  to,
  salesManagerId,
  clientId,
  outcome,
  locationStatus,
  page,
  limit,
}) {
  const filter = { ...scopeFor(requester) };
  // Staff ke liye salesManagerId scope se aata hai; query wala sirf admin ka chalta hai.
  // (ObjectId mein badalna zaroori hai: neeche ka aggregate string ko apne aap cast nahi karta.)
  if (salesManagerId && requester.role !== ROLES.STAFF) filter.salesManagerId = new Types.ObjectId(salesManagerId);
  if (clientId) filter.clientId = new Types.ObjectId(clientId);
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (outcome) filter['result.outcome'] = outcome;
  if (locationStatus) filter['checkIn.locationStatus'] = locationStatus;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const [clients, people] = await Promise.all([
      Client.find({ name: pattern }).distinct('_id'),
      User.find({ role: ROLES.STAFF, name: pattern }).distinct('_id'),
    ]);
    filter.$or = [{ title: pattern }, { clientId: { $in: clients } }, { salesManagerId: { $in: people } }];
  }

  // Status tabs ki ginti (status filter lagne se pehle; baaki filters lagu).
  const byStatus = await Meeting.aggregate([{ $match: { ...filter } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = { all: 0 };
  for (const value of Object.values(MEETING_STATUS)) counts[value] = 0;
  for (const row of byStatus) {
    counts[row._id] = row.count;
    counts.all += row.count;
  }

  if (status !== 'all') filter.status = status;

  const [items, total] = await Promise.all([
    Meeting.find(filter)
      .select('-events -attachments')
      .populate(POPULATE)
      .sort({ startAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Meeting.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), counts };
}

// ---------- Update / Cancel ----------

// Sirf wo meeting badalti / cancel hoti hai jisme check-in abhi nahi hua. Status filter update ke
// andar hi hai, taaki admin ke save aur sales manager ke check-in ki takkar mein check-in na bigde.
async function changeOpenMeeting(id, update, conflictMessage) {
  const meeting = await Meeting.findOneAndUpdate({ _id: id, status: { $in: MEETING_OPEN_STATUSES } }, update, {
    new: true,
  })
    .populate(POPULATE)
    .populate('events.by', 'name');
  if (!meeting) {
    if (!(await Meeting.exists({ _id: id }))) throw new ApiError(404, 'Meeting not found.');
    throw new ApiError(409, conflictMessage);
  }
  return meeting;
}

export async function updateMeeting(id, admin, body) {
  const current = await Meeting.findById(id);
  if (!current) throw new ApiError(404, 'Meeting not found.');

  const { clientId, salesManagerId, date, startTime, endTime, location, ...changes } = body;
  const client = await (clientId ? activeClientOrThrow(clientId) : Client.findById(current.clientId));
  if (clientId) changes.clientId = clientId;
  if (salesManagerId) {
    await assertSalesManager(salesManagerId);
    changes.salesManagerId = salesManagerId;
  }
  if (date) Object.assign(changes, toSchedule(date, startTime, endTime));
  if (location) changes.location = resolveLocation(location, client);

  if (salesManagerId || date) {
    await assertNoClash(
      {
        salesManagerId: changes.salesManagerId ?? current.salesManagerId,
        startAt: changes.startAt ?? current.startAt,
        endAt: changes.endAt ?? current.endAt,
      },
      current._id
    );
  }

  // Audit mein: kaun si cheezein badli (values nahi; wo meeting mein hi hain).
  const events = [{ type: MEETING_EVENTS.UPDATED, by: admin._id, detail: Object.keys(body).join(', ') }];

  // QR assigned sales manager ka hota hai: wo badle to purana QR bekaar, naya banta hai aur dobara bhejna padta hai.
  const reassigned = salesManagerId && String(salesManagerId) !== String(current.salesManagerId);
  const endAt = changes.endAt ?? current.endAt;
  if (reassigned || !current.qr.tokenHash) {
    const version = current.qr.tokenHash ? current.qr.version + 1 : current.qr.version;
    changes.qr = buildQr(current._id, version, endAt, await checkInGrace());
    changes.status = MEETING_STATUS.SCHEDULED;
    events.push({ type: MEETING_EVENTS.QR_GENERATED, by: admin._id, detail: 'Sales manager changed' });
  } else if (date) {
    changes['qr.expiresAt'] = qrExpiry(endAt, await checkInGrace());
  }

  return changeOpenMeeting(
    id,
    { $set: changes, $push: { events: { $each: events } } },
    'Only a meeting that has not started can be changed.'
  );
}

export const cancelMeeting = (id, admin, reason = '') =>
  changeOpenMeeting(
    id,
    {
      $set: { status: MEETING_STATUS.CANCELLED, cancelReason: reason },
      $push: { events: { type: MEETING_EVENTS.CANCELLED, by: admin._id, detail: reason } },
    },
    'Only a meeting that has not started can be cancelled.'
  );

// ---------- QR ----------

const NO_ACTIVE_QR = 'This meeting has started, ended or been cancelled, so it has no active QR code.';

// Admin ko dikhane ke liye. token yahin (aur sirf admin ko) bahar jata hai.
const qrView = (meeting) => ({
  token: meetingToken(meeting._id, meeting.qr.version),
  version: meeting.qr.version,
  expiresAt: meeting.qr.expiresAt,
  expired: meeting.qr.expiresAt <= new Date(),
  sentAt: meeting.qr.sentAt ?? null,
});

export async function getMeetingQr(id, admin) {
  let meeting = await Meeting.findById(id);
  if (!meeting) throw new ApiError(404, 'Meeting not found.');
  if (!MEETING_OPEN_STATUSES.includes(meeting.status)) throw new ApiError(409, NO_ACTIVE_QR);

  // QR aane se pehle bani meeting: pehli baar maangne par bana do.
  if (!meeting.qr.tokenHash) {
    meeting = await changeOpenMeeting(
      id,
      {
        $set: { qr: buildQr(meeting._id, meeting.qr.version, meeting.endAt, await checkInGrace()) },
        $push: { events: { type: MEETING_EVENTS.QR_GENERATED, by: admin._id } },
      },
      NO_ACTIVE_QR
    );
  }
  return qrView(meeting);
}

// Naya QR: purana turant bekaar. Sales manager ko dobara bhejna padta hai, isliye status wapas SCHEDULED.
export async function regenerateMeetingQr(id, admin) {
  const current = await Meeting.findById(id);
  if (!current) throw new ApiError(404, 'Meeting not found.');

  const meeting = await changeOpenMeeting(
    id,
    {
      $set: {
        qr: buildQr(current._id, current.qr.version + 1, current.endAt, await checkInGrace()),
        status: MEETING_STATUS.SCHEDULED,
      },
      $push: { events: { type: MEETING_EVENTS.QR_GENERATED, by: admin._id, detail: 'Regenerated' } },
    },
    NO_ACTIVE_QR
  );
  return { meeting, qr: qrView(meeting) };
}

// Admin ne QR sales manager ko bhej diya (share / download / kisi aur tareeke se).
export async function markMeetingQrSent(id, admin, channel) {
  const meeting = await changeOpenMeeting(
    id,
    {
      $set: { status: MEETING_STATUS.QR_SENT, 'qr.sentAt': new Date() },
      $push: { events: { type: MEETING_EVENTS.QR_SENT, by: admin._id, detail: channel } },
    },
    NO_ACTIVE_QR
  );
  return { meeting, qr: qrView(meeting) };
}
