import api from './axiosInstance.js';

// Login token ke saath file (PDF/Excel) laakar browser mein download karata hai.
// Seedha <a href> isliye nahi chalta kyunki usme Authorization header nahi jata.
export async function downloadFile(path, { params, filename }) {
  const blob = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
