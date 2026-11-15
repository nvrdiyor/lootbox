// Statik fayllarni xavfsiz uzatish: faqat ruxsat etilgan nomlar, papkadan tashqariga
// chiqib bo'lmaydi, tur fayl kengaytmasidan aniqlanadi.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Faqat oddiy nomlar: harf, raqam, "-", "_", "." va "/" (yuqoriga chiqish yo'q).
const SAFE_PATH = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const REVALIDATE = 'no-cache';

/**
 * @returns {Promise<Response|null>} null — fayl topilmadi (404'ni chaqiruvchi beradi)
 */
export async function sendFile(c, rootDir, relPath, { cacheControl = REVALIDATE } = {}) {
  if (typeof relPath !== 'string' || !SAFE_PATH.test(relPath) || relPath.includes('..')) return null;
  const type = TYPES[path.extname(relPath).toLowerCase()];
  if (!type) return null;

  const root = path.resolve(rootDir);
  const abs = path.resolve(root, relPath);
  if (!abs.startsWith(root + path.sep)) return null;

  let stat;
  try {
    stat = await fs.promises.stat(abs);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': type,
    'Cache-Control': cacheControl,
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  };
  if (type === 'image/svg+xml') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (c.req.header('if-none-match') === etag) return new Response(null, { status: 304, headers });

  headers['Content-Length'] = String(stat.size);
  if (c.req.method === 'HEAD') return new Response(null, { headers });
  return new Response(Readable.toWeb(fs.createReadStream(abs)), { headers });
}

const versions = new Map();
/** Fayl o'zgarganda brauzer keshi yangilanishi uchun: /site/css/site.css?v=abc */
export function assetVersion(publicDir, urlPath, fresh = false) {
  if (!fresh && versions.has(urlPath)) return versions.get(urlPath);
  let version = '0';
  try {
    version = Math.floor(fs.statSync(path.join(publicDir, urlPath)).mtimeMs).toString(36);
  } catch {
    // fayl yo'q
  }
  versions.set(urlPath, version);
  return version;
}
