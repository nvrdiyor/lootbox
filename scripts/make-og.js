// Ulashish uchun muqova rasmlarini yaratadi:  npm run og
// Dev server ishlab turgan bo'lishi kerak (npm run dev). Kompyuterdagi Chrome ishlatiladi.
// Natija: public/brand/og-lootbox.png va og-fit.png (1200×630) — Telegram va ijtimoiy
// tarmoqlarda havola ulashilganda chiqadigan rasm.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const outDir = path.join(ROOT, 'public', 'brand');
const port = process.env.PORT || '3210';

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = candidates.find((file) => fs.existsSync(file));
if (!chrome) {
  console.error('Chrome topilmadi. CHROME_PATH o‘zgaruvchisida yo‘lini ko‘rsating.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
// Alohida vaqtinchalik profil: o'zingiz ishlatayotgan Chrome'ga (ochiq oynalar, parollar) tegilmaydi
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-og-'));
for (const brand of ['lootbox', 'fit']) {
  const file = path.join(outDir, `og-${brand}.png`);
  const result = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=5000',
      `--screenshot=${file}`,
      `http://localhost:${port}/__dev/og?b=${brand}`,
    ],
    { stdio: 'ignore', timeout: 60_000 },
  );
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  if (result.status !== 0 || size < 2000) {
    console.error(`og-${brand}.png yaratilmadi (server ishlab turibdimi? npm run dev).`);
    process.exit(1);
  }
  console.log(`  og-${brand}.png — ${(size / 1024).toFixed(0)} KB`);
}
fs.rmSync(profile, { recursive: true, force: true });
