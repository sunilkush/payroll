import { Company } from '../models/Company.js';
import { Meeting } from '../models/Meeting.js';
import { ApiError } from '../utils/ApiError.js';
import {
  FOLLOW_UP_STATUS,
  LOCATION_STATUS,
  MEETING_EVENTS,
  MEETING_OPEN_STATUSES,
  MEETING_STATUS,
} from '../utils/constants.js';
import { todayStr, toTimeStr, zonedTime } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';
import { distanceInMeters } from './geoService.js';
import { hashToken } from './qrService.js';

// Sales manager ki visit: QR scan -> (location check) -> check-in -> check-out.
// Yahan ke saare checks server par hote hain; phone se aayi kisi cheez par bharosa nahi.

const POPULATE = [{ path: 'clientId', select: 'name contactPerson phone address' }];

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  return company;
}

const addEvent = (meetingId, event) => Meeting.updateOne({ _id: meetingId }, { $push: { events: event } });

// Check-in kab se kab tak ho sakta hai: start se grace minute pehle, end ke grace minute baad tak.
export function checkInWindow(meeting, graceMinutes) {
  const graceMs = graceMinutes * 60 * 1000;
  return { opensAt: new Date(meeting.startAt.getTime() - graceMs), closesAt: new Date(meeting.endAt.getTime() + graceMs) };
}

// QR ka token -> meeting. Token galat ho, purana (regenerate ho chuka) ho ya doosri company ka ho:
// teeno mein same jawab, taaki koi andaza na laga sake ki kaun sa token asli tha.
async function findByToken(token) {
  const meeting = await Meeting.findOne({ 'qr.tokenHash': hashToken(token) }).populate(POPULATE);
  if (!meeting) throw new ApiError(404, 'Invalid QR code. Ask your admin for the latest QR.');
  return meeting;
}

// Is waqt ye user is meeting mein check-in kar sakta hai ya nahi. Nahi to wajah ke saath error.
// (Location yahan nahi dekhte; wo check-in ke waqt GPS ke saath dekhi jati hai.)
export function assertCanCheckIn(meeting, user, graceMinutes, now = new Date()) {
  if (String(meeting.salesManagerId) !== String(user._id)) {
    throw new ApiError(403, 'This meeting is not assigned to you.');
  }
  if (meeting.status === MEETING_STATUS.CANCELLED) throw new ApiError(409, 'This meeting has been cancelled.');
  if (meeting.status === MEETING_STATUS.COMPLETED) throw new ApiError(409, 'This meeting has already been completed.');
  if (meeting.status === MEETING_STATUS.CHECKED_IN) throw new ApiError(409, 'You have already checked in to this meeting.');
  if (meeting.status === MEETING_STATUS.MISSED) {
    throw new ApiError(409, 'This meeting was missed. Ask your admin to schedule it again.');
  }

  const { opensAt, closesAt } = checkInWindow(meeting, graceMinutes);
  if (meeting.date !== todayStr()) {
    // Beeti hui meeting ka QR expire ho chuka hai; aane wali ka abhi chalu nahi hua.
    if (now > closesAt) throw new ApiError(409, 'This QR code has expired.');
    throw new ApiError(409, `This meeting is not scheduled for today. It is on ${meeting.date}.`);
  }
  if (now < opensAt) throw new ApiError(409, `Too early. Check-in opens at ${toTimeStr(opensAt)}.`);
  if (now > closesAt) throw new ApiError(409, 'This QR code has expired. The check-in time for this meeting is over.');
}

// Sales manager ko scan ke baad dikhne wali jaankari (audit history aur QR ki cheezein nahi).
function toScanView(meeting, graceMinutes) {
  const { opensAt, closesAt } = checkInWindow(meeting, graceMinutes);
  return {
    _id: meeting._id,
    title: meeting.title,
    purpose: meeting.purpose,
    notes: meeting.notes,
    client: meeting.clientId,
    contactPerson: meeting.contactPerson,
    contactPhone: meeting.contactPhone,
    date: meeting.date,
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    location: meeting.location,
    status: meeting.status,
    checkIn: meeting.checkIn ?? null,
    checkInOpensAt: opensAt,
    checkInClosesAt: closesAt,
  };
}

// QR scan: token se meeting dhoondh kar batata hai ki check-in ho sakta hai ya nahi.
// Jo meeting pehle se checked-in hai uske liye error nahi: phone ko pata chale ki visit chalu hai
// (jaise page refresh ke baad dobara scan), taaki wo seedha check-out par ja sake.
export async function scanMeetingQr(user, token) {
  const [company, meeting] = await Promise.all([getCompanyOrThrow(), findByToken(token)]);
  const grace = company.settings.meetingCheckInGraceMin;
  const mine = String(meeting.salesManagerId) === String(user._id);

  if (mine && meeting.status === MEETING_STATUS.CHECKED_IN) {
    return { canCheckIn: false, alreadyCheckedIn: true, meeting: toScanView(meeting, grace) };
  }

  try {
    assertCanCheckIn(meeting, user, grace);
  } catch (err) {
    // Fail hua scan bhi audit mein: kisne, kyun.
    await addEvent(meeting._id, { type: MEETING_EVENTS.CHECK_IN_REJECTED, by: user._id, detail: `QR scan: ${err.message}` });
    throw err;
  }

  await addEvent(meeting._id, { type: MEETING_EVENTS.QR_SCANNED, by: user._id });
  return { canCheckIn: true, alreadyCheckedIn: false, meeting: toScanView(meeting, grace) };
}

// ---------- Check-in ----------

// 850 -> '850 m', 1234 -> '1.2 km'
const formatDistance = (meters) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`);

// Phone ki location ko meeting ki location se milata hai. Doori hamesha server nikalta hai.
function locate(meeting, company, position) {
  if (position.lat == null || position.lng == null) return { locationStatus: LOCATION_STATUS.LOCATION_UNAVAILABLE };
  const distance = Math.round(distanceInMeters(position, meeting.location));
  let locationStatus = LOCATION_STATUS.VERIFIED;
  if (distance > meeting.location.radius) locationStatus = LOCATION_STATUS.OUTSIDE_GEOFENCE;
  // Kharab GPS par doori par bharosa nahi kar sakte, chahe wo radius ke andar dikhe.
  if (position.accuracy > company.settings.maxGpsAccuracy) locationStatus = LOCATION_STATUS.LOW_ACCURACY;
  return { lat: position.lat, lng: position.lng, accuracy: position.accuracy, distance, locationStatus };
}

const VISIT_POPULATE = [
  { path: 'clientId', select: 'name contactPerson phone address' },
  { path: 'salesManagerId', select: 'name employeeCode' },
];

// QR sahi hona kaafi nahi: sahi banda, sahi waqt aur sahi jagah (geofence) teeno chahiye.
export async function checkIn(user, { token, ...position }, meta) {
  const [company, meeting] = await Promise.all([getCompanyOrThrow(), findByToken(token)]);
  const reject = async (error, detail = error.message) => {
    await addEvent(meeting._id, { type: MEETING_EVENTS.CHECK_IN_REJECTED, by: user._id, detail });
    throw error;
  };

  try {
    assertCanCheckIn(meeting, user, company.settings.meetingCheckInGraceMin);
  } catch (err) {
    await reject(err);
  }

  const place = locate(meeting, company, position);
  const where = `${formatDistance(place.distance)} away, GPS accuracy ${Math.round(position.accuracy)} m`;
  if (place.locationStatus === LOCATION_STATUS.LOW_ACCURACY) {
    await reject(
      new ApiError(400, `Your GPS accuracy is too low (${Math.round(position.accuracy)} m). Move to an open area and try again.`),
      `Low GPS accuracy: ${where}`
    );
  }
  if (place.locationStatus === LOCATION_STATUS.OUTSIDE_GEOFENCE) {
    await reject(
      new ApiError(
        403,
        `You're approximately ${formatDistance(place.distance)} away from the meeting location. Please reach the client location before checking in.`
      ),
      `Outside geofence: ${where}`
    );
  }

  // Status filter update ke andar hai: do baar tap ya do phone se ek hi check-in banta hai.
  let checkedIn;
  try {
    checkedIn = await Meeting.findOneAndUpdate(
      { _id: meeting._id, salesManagerId: user._id, status: { $in: MEETING_OPEN_STATUSES } },
      {
        $set: {
          status: MEETING_STATUS.CHECKED_IN,
          checkIn: { at: new Date(), ...place, ip: meta.ip, userAgent: meta.userAgent },
        },
        $push: { events: { type: MEETING_EVENTS.CHECKED_IN, by: user._id, detail: where } },
      },
      { new: true }
    ).populate(VISIT_POPULATE);
  } catch (err) {
    // Unique index: ek sales manager ki ek waqt mein ek hi khuli visit.
    if (err.code !== 11000) throw err;
    const open = await Meeting.findOne({ salesManagerId: user._id, status: MEETING_STATUS.CHECKED_IN }).populate('clientId', 'name');
    await reject(
      new ApiError(409, `You are still checked in at ${open?.clientId?.name ?? 'another meeting'}. Check out there first.`)
    );
  }
  if (!checkedIn) throw new ApiError(409, 'You have already checked in to this meeting.');
  return checkedIn;
}

// ---------- Check-out + result ----------

// Follow-up ka waqt. Time na diya ho to subah 10 baje.
function toFollowUp({ date, time, notes }, outcome) {
  if (!date) {
    if (outcome === 'FOLLOW_UP_REQUIRED') {
      throw new ApiError(400, 'Choose the next follow-up date.', [{ field: 'followUp.date', message: 'Choose the next follow-up date.' }]);
    }
    return undefined;
  }
  if (date < todayStr()) {
    throw new ApiError(400, 'The follow-up date cannot be in the past.', [{ field: 'followUp.date', message: 'The follow-up date cannot be in the past.' }]);
  }
  return { at: zonedTime(date, time ?? '10:00'), notes: notes ?? '', status: FOLLOW_UP_STATUS.PENDING };
}

// Check-out aur meeting ka nateeja ek hi step mein: visit kabhi "check-out ho gaya par outcome nahi" mein nahi atakti.
// Yahan location sirf darj hoti hai (bahar ho to bhi check-out hota hai), warna banda visit band hi na kar paye.
export async function checkOut(id, user, { result, followUp, ...position }, meta) {
  const [company, meeting] = await Promise.all([
    getCompanyOrThrow(),
    Meeting.findOne({ _id: id, salesManagerId: user._id }),
  ]);
  if (!meeting) throw new ApiError(404, 'Meeting not found.');
  if (meeting.status === MEETING_STATUS.COMPLETED) throw new ApiError(409, 'This meeting has already been completed.');
  if (meeting.status !== MEETING_STATUS.CHECKED_IN) throw new ApiError(409, 'You have not checked in to this meeting.');

  const now = new Date();
  const place = locate(meeting, company, position);
  const nextFollowUp = toFollowUp(followUp, result.outcome);
  const durationMinutes = Math.max(0, Math.round((now - meeting.checkIn.at) / 60000));

  const completed = await Meeting.findOneAndUpdate(
    { _id: id, salesManagerId: user._id, status: MEETING_STATUS.CHECKED_IN },
    {
      $set: {
        status: MEETING_STATUS.COMPLETED,
        checkOut: { at: now, ...place, ip: meta.ip, userAgent: meta.userAgent },
        durationMinutes,
        result,
        ...(nextFollowUp && { followUp: nextFollowUp }),
      },
      $push: {
        events: {
          $each: [
            { type: MEETING_EVENTS.CHECKED_OUT, by: user._id, at: now, detail: place.distance == null ? 'Location not available' : `${formatDistance(place.distance)} away` },
            { type: MEETING_EVENTS.COMPLETED, by: user._id, at: now, detail: result.outcome },
          ],
        },
      },
    },
    { new: true }
  ).populate(VISIT_POPULATE);
  if (!completed) throw new ApiError(409, 'This meeting has already been completed.');
  return completed;
}
