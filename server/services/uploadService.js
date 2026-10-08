import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Upload hui files server ki disk par (env.uploadDir) rehti hain, kabhi seedhe URL se nahi khulti:
// har file login + ownership check wale route se hi bahar jati hai.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_TEXT = '5 MB';

// File pehle memory mein aati hai, jaanch ke baad hi disk par likhi jati hai.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } });

// Usage: router.post('/x', singleFile('photo'), ...). File req.file mein, baaki fields req.body mein (string).
export const singleFile = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? `The file is too large (max ${MAX_FILE_TEXT}).` : 'Upload one file at a time.';
      return next(new ApiError(400, message));
    }
    next(err);
  });

const startsWith = (buffer, bytes, offset = 0) => bytes.every((byte, index) => buffer[offset + index] === byte);

// File ka asli type uske pehle bytes se (naam ya browser ke bataye type par bharosa nahi).
function detectType(buffer) {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { kind: 'image', mimeType: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: 'image', mimeType: 'image/png', ext: 'png' };
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: 'image', mimeType: 'image/webp', ext: 'webp' };
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { kind: 'pdf', mimeType: 'application/pdf', ext: 'pdf' };
  return null;
}

// Stored path hamesha upload folder ke andar hi khule.
export function absolutePath(relativePath) {
  const full = path.resolve(env.uploadDir, relativePath);
  if (!full.startsWith(path.resolve(env.uploadDir) + path.sep)) throw new ApiError(404, 'File not found.');
  return full;
}

// file: multer ka req.file. allow: ['image'] ya ['image', 'pdf']. folder: upload folder ke andar ka raasta.
// Return: Meeting ke fileSchema ke fields. Disk par naam random hota hai; user ka diya naam sirf dikhane ke liye.
export async function saveFile(file, { allow, folder }) {
  if (!file) throw new ApiError(400, 'Choose a file to upload.');
  const type = detectType(file.buffer);
  if (!type || !allow.includes(type.kind)) {
    throw new ApiError(400, allow.includes('pdf') ? 'Only JPG, PNG, WEBP or PDF files are allowed.' : 'Only JPG, PNG or WEBP photos are allowed.');
  }

  const relativePath = path.posix.join(folder, `${crypto.randomBytes(16).toString('hex')}.${type.ext}`);
  const full = absolutePath(relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, file.buffer);

  // Dikhane wala naam: raasta aur ajeeb akshar hata kar
  const name = path.basename(file.originalname || '').replace(/[^\w.\- ()]/g, '_').slice(0, 100) || `file.${type.ext}`;
  return { name, path: relativePath, mimeType: type.mimeType, size: file.size };
}

export async function removeFile(relativePath) {
  if (!relativePath) return;
  await fs.rm(absolutePath(relativePath), { force: true });
}
