import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE, refreshSession, tokenStore } from './client';

// Server se file (jaise salary slip PDF) phone mein save karke share sheet kholta hai (WhatsApp, Drive, print...).
//   path       API ka path, jaise '/payroll/123/slip'
//   filename   phone par is naam se ('salary-slip-EMP001-2026-09.pdf')
// Access token purana ho to ek baar refresh karke dobara koshish. Fail ho to { message } wala error.
export async function downloadAndShare(path, filename, { mimeType = 'application/pdf', dialogTitle } = {}) {
  const folder = new Directory(Paths.cache, 'downloads');
  if (!folder.exists) folder.create({ idempotent: true, intermediates: true });
  const target = new File(folder, filename);

  const fetchFile = () =>
    File.downloadFileAsync(`${API_BASE}${path}`, target, {
      headers: { Authorization: `Bearer ${tokenStore.get()}` },
      idempotent: true,
    });

  let file;
  try {
    file = await fetchFile();
  } catch (err) {
    const status = Number(String(err?.message).match(/\b([45]\d\d)\b/)?.[1]);
    if (status === 401 && tokenStore.getRefresh()) {
      try {
        await refreshSession();
        file = await fetchFile();
      } catch {
        throw { message: 'Your session has expired. Please sign in again.' };
      }
    } else if (status === 404) {
      throw { message: 'This file is not available any more.' };
    } else if (status) {
      throw { message: 'Could not download the file. Please try again.' };
    } else {
      throw { message: 'Could not connect to the server. Check your internet and try again.' };
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw { message: 'Sharing is not available on this device. The file was saved in the app.' };
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: dialogTitle ?? filename, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
  return file;
}
