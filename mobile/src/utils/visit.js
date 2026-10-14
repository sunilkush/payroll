import { Directory, File, Paths } from 'expo-file-system';

// Check-in kitne minute pehle / baad tak (company ki meetingCheckInGraceMin) staff ko list mein nahi milti.
// QR scan ke jawab mein asli window aati hai; usse pehle server ka default (30 min) maan kar dikhate hain.
export const DEFAULT_GRACE_MIN = 30;

export function checkInWindow(meeting, graceMinutes = DEFAULT_GRACE_MIN) {
  const graceMs = graceMinutes * 60 * 1000;
  return { opensAt: new Date(new Date(meeting.startAt).getTime() - graceMs), closesAt: new Date(new Date(meeting.endAt).getTime() + graceMs) };
}

export const OUTCOMES = [
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'FOLLOW_UP_REQUIRED', label: 'Follow-up needed' },
  { value: 'PROPOSAL_REQUIRED', label: 'Proposal needed' },
  { value: 'DEMO_REQUIRED', label: 'Demo needed' },
  { value: 'DEAL_CLOSED', label: 'Deal closed' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'CLIENT_UNAVAILABLE', label: 'Client unavailable' },
];

// ---------- Visit ki adhoori haalat (app band ho jaye to wahin se) ----------
// Phone mein ek JSON file: { [meetingId]: { step, photoUri, photoUploaded, notes, outcome, followUp } }.
// Photo bhi app ke folder mein copy hoti hai (camera ki cache file mit sakti hai).

const folder = () => new Directory(Paths.document, 'visits');
const storeFile = () => new File(folder(), 'progress.json');

async function readAll() {
  try {
    const file = storeFile();
    return file.exists ? JSON.parse(await file.text()) : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    const dir = folder();
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const file = storeFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(all));
  } catch {
    // Save na ho to bhi visit chalti rahe; bas app band hone par shuru se.
  }
}

export const getVisitProgress = async (meetingId) => (await readAll())[meetingId] ?? null;

export async function saveVisitProgress(meetingId, changes) {
  const all = await readAll();
  all[meetingId] = { ...all[meetingId], ...changes, savedAt: Date.now() };
  writeAll(all);
  return all[meetingId];
}

export async function clearVisitProgress(meetingId) {
  const all = await readAll();
  const photo = all[meetingId]?.photoUri;
  delete all[meetingId];
  writeAll(all);
  if (photo) {
    try {
      new File(photo).delete();
    } catch {
      // purani photo na mile to koi baat nahi
    }
  }
}

// Camera ki photo ko app ke folder mein rakhta hai (meeting ke naam se). Return: nayi uri.
export function keepPhoto(meetingId, uri) {
  const dir = folder();
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, `${meetingId}-${Date.now()}.jpg`);
  new File(uri).copy(target);
  return target.uri;
}
