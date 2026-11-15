// Tovar tugmasi qayerga olib borishini hal qiladi: Uzum, Telegram kanal yoki lichka.
// Qoida: tovarda tanlangan yo'nalish → bo'lmasa sayt sozlamasidagi standart →
// u ham bo'sh bo'lsa, mavjud bo'lgan birinchi havola.

export const DEST_ORDER = ['uzum', 'channel', 'dm'];

const TG_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me', 'telegram.dog']);
const TG_USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
const TG_PATH = /^[A-Za-z0-9_+\-/]{2,120}$/;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Telegram manzilini tushunadi: "@kanal", "kanal", "t.me/kanal", "https://t.me/kanal/123",
 * "https://t.me/+taklifkodi".
 * @returns {{ kind: 'username'|'link', username: string|null, url: string } | null}
 */
export function parseTelegram(input) {
  let value = String(input ?? '').trim();
  if (!value) return null;
  if (value.startsWith('@')) value = value.slice(1);
  if (TG_USERNAME.test(value)) return { kind: 'username', username: value, url: `https://t.me/${value}` };

  let url;
  try {
    url = new URL(HAS_SCHEME.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!TG_HOSTS.has(url.hostname.toLowerCase())) return null;
  const path = url.pathname.replace(/\/+$/g, '').slice(1);
  if (!TG_PATH.test(path) || path.includes('//')) return null;
  if (TG_USERNAME.test(path)) return { kind: 'username', username: path, url: `https://t.me/${path}` };
  return { kind: 'link', username: null, url: `https://t.me/${path}` };
}

/** Oddiy veb-havola (https://...). Sxema yozilmagan bo'lsa https qo'shiladi. */
export function parseHttpUrl(input) {
  const value = String(input ?? '').trim();
  // "/..." — sayt ichidagi manzil, havola emas; teskari chiziqni brauzerlar "/" deb o'qiydi
  if (!value || /\s/.test(value) || value.startsWith('/') || value.includes('\\')) return null;
  let url;
  try {
    url = new URL(HAS_SCHEME.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.')) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export function isUzumUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'uzum.uz' || host.endsWith('.uzum.uz');
  } catch {
    return false;
  }
}

function shopUrl(brand, settings) {
  return brand === 'fit' ? settings.uzum_shop_fit : settings.uzum_shop_lootbox;
}

function dmText(product, settings) {
  const template = settings.dm_template || '';
  return template.replaceAll('{nom}', product?.name || '').trim();
}

/** Bitta yo'nalish uchun tayyor havola (bo'lmasa null). */
export function linkFor(type, product, settings) {
  if (type === 'uzum') {
    return product?.uzum_url || shopUrl(product?.brand, settings) || null;
  }
  if (type === 'channel') {
    const parsed = parseTelegram(product?.channel_url) || parseTelegram(settings.tg_channel);
    return parsed ? parsed.url : null;
  }
  if (type === 'dm') {
    const parsed = parseTelegram(product?.dm_username) || parseTelegram(settings.tg_dm);
    if (!parsed || parsed.kind !== 'username') return null;
    const text = dmText(product, settings);
    return text ? `${parsed.url}?text=${encodeURIComponent(text)}` : parsed.url;
  }
  return null;
}

/**
 * Tovarning asosiy tugmasi.
 * @returns {{ type: 'uzum'|'channel'|'dm', url: string, fallback: boolean } | null}
 */
export function resolveDestination(product, settings) {
  const preferred = DEST_ORDER.includes(product.dest_type) ? product.dest_type : settings.default_dest;
  const order = [preferred, ...DEST_ORDER.filter((type) => type !== preferred)];
  for (const type of order) {
    if (!DEST_ORDER.includes(type)) continue;
    const url = linkFor(type, product, settings);
    if (url) return { type, url, fallback: type !== preferred };
  }
  return null;
}

/** Asosiy tugmadan tashqari mavjud bo'lgan boshqa yo'nalishlar (kichik tugmalar uchun). */
export function otherDestinations(product, settings, primaryType) {
  const out = [];
  for (const type of DEST_ORDER) {
    if (type === primaryType) continue;
    const url = linkFor(type, product, settings);
    if (url) out.push({ type, url });
  }
  return out;
}

/** Brend bo'yicha umumiy havolalar (footer, "kanalga o'tish" bloklari uchun). */
export function brandLinks(brand, settings) {
  const channel = parseTelegram(settings.tg_channel);
  const dm = parseTelegram(settings.tg_dm);
  return {
    uzum: shopUrl(brand, settings) || null,
    channel: channel ? channel.url : null,
    dm: dm && dm.kind === 'username' ? dm.url : null,
    instagram: parseHttpUrl(settings.instagram),
    tiktok: parseHttpUrl(settings.tiktok),
    youtube: parseHttpUrl(settings.youtube),
  };
}
