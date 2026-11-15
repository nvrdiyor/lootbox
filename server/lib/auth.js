// Admin himoyasi: parol .env'dan, sessiya tasodifiy token (bazada faqat xeshi turadi),
// har bir o'zgartiruvchi so'rov CSRF token + Origin tekshiruvidan o'tadi,
// noto'g'ri parol urinishlari IP bo'yicha cheklanadi.
import crypto from 'node:crypto';
import net from 'node:net';
import { getConnInfo } from '@hono/node-server/conninfo';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { config } from '../config.js';
import { get, run, now } from '../db/index.js';
import { getMeta, setMeta } from '../db/repo.js';

export const SESSION_COOKIE = 'lb_admin';
const SESSION_DAYS = 30;
const MIN_PASSWORD = 8;

// Namuna fayllarda uchraydigan "parol"lar haqiqiy parol sifatida qabul qilinmaydi
const PLACEHOLDER_PASSWORDS = new Set(['bu-yerga-parol-yozing', 'changeme', 'password', 'admin123', '12345678', 'qwerty123']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest();
const hashToken = (token) => sha256(token).toString('hex');

export const passwordConfigured = () =>
  config.adminPassword.length >= MIN_PASSWORD && !PLACEHOLDER_PASSWORDS.has(config.adminPassword.toLowerCase());

export function verifyPassword(input) {
  if (!passwordConfigured() || typeof input !== 'string' || !input) return false;
  return crypto.timingSafeEqual(sha256(input), sha256(config.adminPassword));
}

// ---- Urinishlarni cheklash -------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const MAX_TRACKED = 5000;
const attempts = new Map();

export function clientIp(c) {
  if (config.trustProxy) {
    // Faqat proksi (nginx) O'ZI qo'ygan qiymatga ishonamiz: X-Real-IP yoki X-Forwarded-For ning
    // OXIRGI bo'lagi. Boshidagi bo'laklarni mijoz o'zi yozib yuborishi mumkin — ularga ishonilsa,
    // parol urinishlari cheklovini aylanib o'tish yoki egasini bloklab qo'yish mumkin bo'lardi.
    const real = (c.req.header('x-real-ip') || '').trim();
    if (net.isIP(real)) return real;
    const last = (c.req.header('x-forwarded-for') || '').split(',').pop().trim();
    if (net.isIP(last)) return last;
  }
  try {
    return getConnInfo(c).remote.address || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** @returns {number} necha soniyadan keyin yana urinish mumkin (0 — hozir mumkin) */
export function loginBlockedFor(ip) {
  const entry = attempts.get(ip);
  if (!entry) return 0;
  const left = entry.first + WINDOW_MS - now();
  if (left <= 0) {
    attempts.delete(ip);
    return 0;
  }
  return entry.count >= MAX_FAILS ? Math.ceil(left / 1000) : 0;
}

export function noteLoginFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || entry.first + WINDOW_MS <= now()) attempts.set(ip, { count: 1, first: now() });
  else entry.count += 1;
  // Xotira cheklangan: ro'yxat to'lsa, eng eski yozuvlar chiqarib tashlanadi
  while (attempts.size > MAX_TRACKED) attempts.delete(attempts.keys().next().value);
}

export const clearLoginFailures = (ip) => attempts.delete(ip);

// ---- Sessiyalar ------------------------------------------------------------

function isHttps(c) {
  if (config.trustProxy) {
    const proto = c.req.header('x-forwarded-proto');
    if (proto) return proto.split(',')[0].trim() === 'https';
  }
  return new URL(c.req.url).protocol === 'https:';
}

export function startSession(c) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const created = now();
  const expires = created + SESSION_DAYS * 86_400_000;
  run('DELETE FROM sessions WHERE expires_at <= ?', created);
  run(
    'INSERT INTO sessions (token_hash, csrf, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)',
    hashToken(token),
    csrf,
    created,
    expires,
    (c.req.header('user-agent') || '').slice(0, 300),
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    // Sayt HTTPS'da ishlasa cookie faqat HTTPS orqali yuboriladi (proksi sarlavha bermasa ham)
    secure: isHttps(c) || config.siteUrl.startsWith('https://'),
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

/** @returns {{ csrf: string, expires_at: number } | null} */
export function currentSession(c) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const session = get('SELECT csrf, expires_at FROM sessions WHERE token_hash = ?', hashToken(token));
  if (!session || session.expires_at <= now()) return null;
  return session;
}

export function endSession(c) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export const endAllSessions = () => run('DELETE FROM sessions');

/**
 * Server ishga tushganda chaqiriladi: .env dagi parol oldingi safargidan boshqa bo'lsa,
 * barcha ochiq sessiyalar yopiladi (eski parol bilan kirgan qurilmalar chiqarib yuboriladi).
 * Bazada parolning o'zi emas, tuzli sekin xeshi (scrypt) turadi.
 * @returns {boolean} sessiyalar yopildimi
 */
export function endSessionsIfPasswordChanged() {
  if (!passwordConfigured()) return false;
  let salt = getMeta('password_salt');
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
    setMeta('password_salt', salt);
  }
  const print = crypto.scryptSync(config.adminPassword, salt, 32).toString('hex');
  const previous = getMeta('password_print');
  if (previous === print) return false;
  setMeta('password_print', print);
  if (previous === null) return false; // birinchi ishga tushirish
  endAllSessions();
  return true;
}

// ---- CSRF ------------------------------------------------------------------

function requestHost(c) {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-host');
    if (forwarded) return forwarded.split(',')[0].trim().toLowerCase();
  }
  return (c.req.header('host') || new URL(c.req.url).host).toLowerCase();
}

/** So'rov o'z saytimizdan kelganmi (boshqa sayt bizning nomimizdan yubora olmasin). */
export function sameOrigin(c) {
  const origin = c.req.header('origin');
  if (!origin) return c.req.header('sec-fetch-site') === 'same-origin';
  try {
    return new URL(origin).host.toLowerCase() === requestHost(c);
  } catch {
    return false;
  }
}

export function csrfOk(c, session) {
  const sent = Buffer.from(c.req.header('x-csrf-token') || '');
  const expected = Buffer.from(session?.csrf || '');
  if (!sent.length || sent.length !== expected.length) return false;
  return crypto.timingSafeEqual(sent, expected);
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * /admin ostidagi himoya. Kirmagan bo'lsa: sahifa uchun login'ga yo'naltiradi, API uchun 401.
 * Kirgan bo'lsa c.get('session') ichida sessiya bo'ladi.
 */
export function requireAdmin({ api = false } = {}) {
  return async (c, next) => {
    const session = currentSession(c);
    if (!session) {
      if (api) return c.json({ ok: false, error: 'Sessiya tugagan. Qayta kiring.', login: true }, 401);
      const target = c.req.path + (new URL(c.req.url).search || '');
      const back = target.startsWith('/admin') && target !== '/admin' ? `?next=${encodeURIComponent(target)}` : '';
      return c.redirect(`/admin/login${back}`);
    }
    if (!SAFE_METHODS.has(c.req.method)) {
      if (!sameOrigin(c) || !csrfOk(c, session)) {
        return c.json({ ok: false, error: 'So‘rov rad etildi (xavfsizlik tekshiruvi). Sahifani yangilab qayta urining.' }, 403);
      }
    }
    c.set('session', session);
    c.header('Cache-Control', 'no-store');
    await next();
  };
}
