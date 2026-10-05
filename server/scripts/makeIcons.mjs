// PWA ke icons (PNG) banata hai, client/public/favicon.svg wale design se.
// Chalane ka tarika (server folder se):  node scripts/makeIcons.mjs
// Logo badalne par hi dobara chalana hai; bani hui PNG files repo mein rakhi hain.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public');

// rounded: aam icon (gol kone). Maskable icon poora chaukor hota hai aur "P" chhota, kyunki
// Android use apni shape (gola, squircle) mein kaat deta hai.
const icon = ({ rounded, fontSize }) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2563eb" />
        <stop offset="1" stop-color="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#g)" />
    <text x="32" y="${32 + fontSize * 0.35}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}"
      font-weight="700" text-anchor="middle" fill="#fff">P</text>
  </svg>`;

const ICONS = [
  { file: 'pwa-192.png', size: 192, rounded: true, fontSize: 38 },
  { file: 'pwa-512.png', size: 512, rounded: true, fontSize: 38 },
  { file: 'pwa-maskable-512.png', size: 512, rounded: false, fontSize: 28 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, fontSize: 36 },
];

async function launch() {
  for (const channel of [process.env.BROWSER_CHANNEL, 'msedge', 'chrome'].filter(Boolean)) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* agla browser try karo */
    }
  }
  throw new Error('Edge ya Chrome nahi mila.');
}

const browser = await launch();
try {
  for (const { file, size, ...design } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0;background:transparent">${icon(design)}</body>`);
    await page.screenshot({ path: path.join(publicDir, file), omitBackground: true });
    await page.close();
    console.log(`bana: client/public/${file}`);
  }
} finally {
  await browser.close();
}
