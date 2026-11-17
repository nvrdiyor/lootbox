// IndexNow: sayt sahifasi o'zgarganda qidiruv tizimlariga (Yandex, Bing va boshqalar) darhol xabar berish —
// ular yangi tovarni kunlar emas, daqiqalar ichida ko'radi. Google bu usulni qo'llamaydi: unga sitemap.xml
// yetarli (Search Console'da ko'rsatiladi).
//
// Kalit bazada saqlanadi va saytda /<kalit>.txt manzilida ochiq turadi: qidiruv tizimi xabar haqiqatan shu sayt
// egasidan kelganini shunga qarab tekshiradi. Yuboriladigan narsa — faqat saytning ochiq sahifalari manzillari.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { getMeta, setMeta, getSettings } from '../db/repo.js';

const ENDPOINT = 'https://yandex.com/indexnow';
const KEY_PATTERN = /^[a-f0-9]{32}$/;
const META_KEY = 'indexnow_key';

/** Saytning IndexNow kaliti (birinchi so'ralganda yaratiladi) */
export function indexNowKey() {
  let key = getMeta(META_KEY);
  if (!key || !KEY_PATTERN.test(key)) {
    key = crypto.randomBytes(16).toString('hex');
    setMeta(META_KEY, key);
  }
  return key;
}

/** /<nimadir>.txt so'ralganda: bu bizning kalit faylimizmi */
export const isIndexNowKey = (value) => KEY_PATTERN.test(String(value || '')) && value === getMeta(META_KEY);

/** Xabar berish yoqilganmi: faqat haqiqiy (https) manzilli saytda va sozlamada o'chirilmagan bo'lsa */
export function indexNowEnabled() {
  return !config.dev && config.siteUrl.startsWith('https://') && getSettings().indexnow !== '0';
}

/**
 * Manzillarni hozirning o'zida yuboradi.
 * @param {string[]} paths sayt ichidagi yo'llar ("/tovar/...")
 * @returns {Promise<{ ok: boolean, status: number, count: number }>}
 */
export async function submitUrls(paths, { fetchImpl = fetch } = {}) {
  const urlList = [...new Set(paths)].filter((path) => typeof path === 'string' && path.startsWith('/')).slice(0, 10_000).map((path) => config.siteUrl + path);
  if (!urlList.length) return { ok: true, status: 0, count: 0 };
  const key = indexNowKey();
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: config.siteHost, key, keyLocation: `${config.siteUrl}/${key}.txt`, urlList }),
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.status === 200 || res.status === 202, status: res.status, count: urlList.length };
}

// Navbat: admin ketma-ket bir necha marta saqlasa ham, yarim daqiqada bitta so'rov ketadi
const pending = new Set();
let timer = null;

/** O'zgargan sahifalarni navbatga qo'yadi (o'chirilgan bo'lsa yoki sayt lokal ishlayotgan bo'lsa — hech narsa qilmaydi) */
export function queueUrls(...paths) {
  if (!indexNowEnabled()) return false;
  for (const path of paths.flat()) if (typeof path === 'string' && path.startsWith('/')) pending.add(path);
  if (!timer && pending.size) {
    timer = setTimeout(flush, 30_000);
    timer.unref?.();
  }
  return true;
}

async function flush() {
  timer = null;
  const batch = [...pending];
  pending.clear();
  try {
    const result = await submitUrls(batch);
    if (!result.ok) console.warn(`  IndexNow: qabul qilinmadi (HTTP ${result.status}, ${batch.length} ta manzil)`);
  } catch (err) {
    console.warn(`  IndexNow: yuborib bo‘lmadi (${err.message})`);
  }
}
