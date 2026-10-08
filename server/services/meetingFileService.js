import { Meeting } from '../models/Meeting.js';
import { ApiError } from '../utils/ApiError.js';
import { MEETING_STATUS, ROLES } from '../utils/constants.js';
import { absolutePath, removeFile, saveFile } from './uploadService.js';

// Visit ka saboot: ek photo (client ki jagah par li hui) aur kuch attachments.
// Sirf assigned sales manager jodta hai, aur sirf visit ke dauran (check-in ke baad, check-out se pehle).

const MAX_ATTACHMENTS = 5;
// Jawab mein meeting waisi hi jaye jaisi visit page ko chahiye (client aur sales manager ke naam ke saath).
const POPULATE = [
  { path: 'clientId', select: 'name contactPerson phone address' },
  { path: 'salesManagerId', select: 'name employeeCode' },
];

const folderFor = (meeting) => `${meeting.companyId}/meetings/${meeting._id}`;

// Sales manager ki apni chalu visit, warna wajah ke saath error.
async function openVisitOrThrow(id, user) {
  const meeting = await Meeting.findOne({ _id: id, salesManagerId: user._id });
  if (!meeting) throw new ApiError(404, 'Meeting not found.');
  if (meeting.status !== MEETING_STATUS.CHECKED_IN) {
    throw new ApiError(409, 'Files can be added only during the visit (after check-in, before check-out).');
  }
  return meeting;
}

// Photo dobara lene par purani hat jati hai. Time server ka; location aur source phone batata hai
// (source: 'camera' = app ke camera se li, 'upload' = file chuni), isliye ye pakka saboot nahi, sirf jaankari hai.
export async function setVisitPhoto(id, user, file, { lat, lng, source }) {
  const meeting = await openVisitOrThrow(id, user);
  const saved = await saveFile(file, { allow: ['image'], folder: folderFor(meeting) });
  const previous = meeting.visitPhoto?.path;

  meeting.visitPhoto = { ...saved, uploadedAt: new Date(), lat, lng, source };
  await meeting.save();
  await removeFile(previous);
  return meeting.populate(POPULATE);
}

export async function addAttachment(id, user, file) {
  const meeting = await openVisitOrThrow(id, user);
  if (meeting.attachments.length >= MAX_ATTACHMENTS) {
    throw new ApiError(400, `A meeting can have at most ${MAX_ATTACHMENTS} attachments.`);
  }
  const saved = await saveFile(file, { allow: ['image', 'pdf'], folder: folderFor(meeting) });
  meeting.attachments.push({ ...saved, uploadedAt: new Date() });
  await meeting.save();
  return meeting.populate(POPULATE);
}

export async function removeAttachment(id, user, fileId) {
  const meeting = await openVisitOrThrow(id, user);
  const attachment = meeting.attachments.id(fileId);
  if (!attachment) throw new ApiError(404, 'File not found.');
  const { path } = attachment;
  attachment.deleteOne();
  await meeting.save();
  await removeFile(path);
  return meeting.populate(POPULATE);
}

// File dekhna: admin (apni company) ya assigned sales manager. fileId na ho to visit photo.
// Return: { file: disk ka poora raasta, mimeType, name }
export async function getMeetingFile(id, requester, fileId) {
  const scope = requester.role === ROLES.STAFF ? { salesManagerId: requester._id } : {};
  const meeting = await Meeting.findOne({ _id: id, ...scope }).select('visitPhoto attachments');
  const stored = meeting && (fileId ? meeting.attachments.id(fileId) : meeting.visitPhoto);
  if (!stored?.path) throw new ApiError(404, 'File not found.');
  return { file: absolutePath(stored.path), mimeType: stored.mimeType, name: stored.name };
}
