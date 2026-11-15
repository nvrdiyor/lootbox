// Sozlamalar: .env faylidan o'qiladi. .env yo'q bo'lsa, birinchi ishga tushirishda
// tasodifiy admin paroli bilan yaratiladi (fayl .gitignore'da, git'ga tushmaydi).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

/** @returns {boolean} true — .env hozir yaratildi */
function ensureEnvFile() {
  if (process.env.ADMIN_PASSWORD || fs.existsSync(ENV_FILE)) return false;
  const password = crypto.randomBytes(9).toString('base64url');
  const body = [
    '# LOOTBOX sayti sozlamalari. Bu fayl git\'ga tushmaydi.',
    '# Admin panel paroli (/admin). O\'zgartirgach serverni qayta ishga tushiring.',
    `ADMIN_PASSWORD=${password}`,
    '',
    'PORT=3210',
    'HOST=127.0.0.1',
    '',
  ].join('\n');
  try {
    fs.writeFileSync(ENV_FILE, body, { flag: 'wx' });
    return true;
  } catch (err) {
    if (err && err.code === 'EEXIST') return false;
    throw err;
  }
}

const envCreated = ensureEnvFile();
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const bool = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
};

const port = Number.parseInt(process.env.PORT || '3210', 10);
const dataDir = path.resolve(ROOT, process.env.DATA_DIR || 'data');

// SITE_URL: saytning ochiq manzili, masalan https://lootbox.uz (noto'g'ri yozilgan bo'lsa e'tiborga olinmaydi)
let siteUrl = '';
let siteHost = '';
try {
  const raw = (process.env.SITE_URL || '').trim();
  if (raw) {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      siteUrl = parsed.origin;
      siteHost = parsed.hostname.toLowerCase();
    }
  }
} catch {
  console.warn('  DIQQAT: .env dagi SITE_URL noto‘g‘ri yozilgan (masalan: https://lootbox.uz). E’tiborga olinmadi.');
}

export const config = {
  root: ROOT,
  dev: process.argv.includes('--dev'),
  port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 3210,
  host: process.env.HOST || '127.0.0.1',
  siteUrl,
  siteHost,
  trustProxy: bool(process.env.TRUST_PROXY),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  envCreated,
  envFile: ENV_FILE,
  dataDir,
  dbFile: path.join(dataDir, 'lootbox.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  publicDir: path.join(ROOT, 'public'),
};

fs.mkdirSync(config.uploadsDir, { recursive: true });
