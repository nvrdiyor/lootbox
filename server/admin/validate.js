// Admin formalaridan kelgan ma'lumotni tekshirish. Brauzerga ishonilmaydi: har bir maydon
// shu yerda tozalanadi va cheklanadi. Har funksiya { data, errors, ok } qaytaradi —
// errors: { maydon: 'o‘zbekcha xabar' }.
import { BRANDS, DEST_TYPES, LINK_TYPES } from '../db/schema.js';
import { getCategory, getProduct, getImage, SETTING_DEFAULTS } from '../db/repo.js';
import { parseHttpUrl, parseTelegram, DEST_ORDER } from '../lib/links.js';
import { slugify } from '../lib/text.js';
import { isArtKey, TONES } from '../site/art.js';

export const LIMITS = {
  name: 140,
  tagline: 160,
  description: 5000,
  features: 3000,
  price: 1_000_000_000,
  images: 12,
  categoryName: 60,
  categoryTagline: 120,
  slideKicker: 40,
  slideTitle: 90,
  slideSubtitle: 220,
  slideCta: 40,
  searchTerms: 400,
  searchTermCount: 12,
  searchTerm: 60,
  metaTitle: 120,
  metaDescription: 300,
  categoryIntro: 900,
};

/** Boshqaruv belgilarini olib tashlaydi (yangi qator va tab qoladi). */
function strip(value) {
  const source = String(value ?? '').replace(/\r\n?/g, '\n');
  let out = '';
  for (const ch of source) {
    const code = ch.codePointAt(0);
    if (code === 10 || code === 9 || (code >= 32 && code !== 127)) out += ch;
  }
  return out;
}

/** Bir qatorli matn */
const line = (value) => strip(value).replace(/\s+/g, ' ').trim();

/** Ko'p qatorli matn: qator oxiridagi bo'sh joylar va ortiqcha bo'sh qatorlar tozalanadi */
const block = (value) =>
  strip(value)
    .split('\n')
    .map((row) => row.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const flag = (value) => (value === true || value === 1 || value === '1' || value === 'on' || value === 'true' ? 1 : 0);

/**
 * Qidiruv so'zlari: "kovrik, mousepad; коврик" → "kovrik, mousepad, коврик" (takrorlarsiz, vergul bilan).
 * Ko'p so'z yozib tashlash foyda bermaydi (qidiruv tizimlari buni yoqtirmaydi), shuning uchun soni cheklangan.
 */
function searchTerms(errors, field, value) {
  const seen = new Set();
  const list = [];
  for (const part of strip(value).split(/[,;\n]+/)) {
    const term = part.replace(/\s+/g, ' ').trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    list.push(term);
  }
  if (list.length > LIMITS.searchTermCount) errors[field] = `Qidiruv so‘zlari juda ko‘p: ${list.length} ta. Eng ko‘pi ${LIMITS.searchTermCount} ta — eng muhimlarini qoldiring.`;
  else if (list.some((term) => term.length > LIMITS.searchTerm)) errors[field] = `Har bir qidiruv so‘zi ${LIMITS.searchTerm} belgidan oshmasin.`;
  return list.join(', ');
}

/** Tovar va kategoriya uchun umumiy SEO maydonlari */
function seoFields(errors, data, input) {
  data.search_terms = searchTerms(errors, 'search_terms', input.search_terms);
  data.meta_title = line(input.meta_title);
  tooLong(errors, 'meta_title', data.meta_title, LIMITS.metaTitle, 'Sahifa sarlavhasi');
  data.meta_description = line(input.meta_description);
  tooLong(errors, 'meta_description', data.meta_description, LIMITS.metaDescription, 'Sahifa tavsifi');
}

function tooLong(errors, field, value, max, label) {
  if (value.length > max) errors[field] = `${label} juda uzun: ${value.length} belgi. Eng ko‘pi ${max} ta.`;
}

/** Narx: bo'sh → null, aks holda 1 … 1 000 000 000 oralig'idagi butun son */
function money(errors, field, value) {
  const raw = String(value ?? '').replace(/\s+/g, '');
  if (!raw) return null;
  if (!/^\d{1,12}$/.test(raw)) {
    errors[field] = 'Narx faqat raqamlardan iborat bo‘lishi kerak. Masalan: 129000';
    return null;
  }
  const amount = Number(raw);
  if (amount <= 0 || amount > LIMITS.price) {
    errors[field] = 'Narx 1 so‘mdan 1 000 000 000 so‘mgacha bo‘lishi kerak.';
    return null;
  }
  return amount;
}

function brandOf(errors, value) {
  if (BRANDS.includes(value)) return value;
  errors.brand = 'Brendni tanlang.';
  return null;
}

function imageId(errors, field, value) {
  if (value == null || value === '' || value === 0 || value === '0') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || !getImage(id)) {
    errors[field] = 'Rasm topilmadi. Uni qayta yuklang.';
    return null;
  }
  return id;
}

// ---- Tovar -----------------------------------------------------------------

export function cleanProduct(input = {}) {
  const errors = {};
  const data = {};

  data.brand = brandOf(errors, input.brand);

  data.name = line(input.name);
  if (!data.name) errors.name = 'Tovar nomini yozing.';
  else tooLong(errors, 'name', data.name, LIMITS.name, 'Nom');

  const slug = line(input.slug);
  data.slug = slug ? slugify(slug) : '';

  data.tagline = line(input.tagline);
  tooLong(errors, 'tagline', data.tagline, LIMITS.tagline, 'Qisqa izoh');

  data.description = block(input.description);
  tooLong(errors, 'description', data.description, LIMITS.description, 'Tavsif');

  data.features = block(input.features);
  tooLong(errors, 'features', data.features, LIMITS.features, 'Xususiyatlar');

  seoFields(errors, data, input);

  data.price = money(errors, 'price', input.price);
  data.old_price = money(errors, 'old_price', input.old_price);
  if (!errors.price && !errors.old_price && data.old_price != null) {
    if (data.price == null) errors.old_price = 'Avval hozirgi narxni yozing.';
    else if (data.old_price <= data.price) errors.old_price = 'Eski narx hozirgi narxdan katta bo‘lishi kerak.';
  }

  data.category_id = null;
  if (input.category_id != null && input.category_id !== '' && input.category_id !== '0') {
    const id = Number(input.category_id);
    const category = Number.isInteger(id) && id > 0 ? getCategory(id) : null;
    if (!category) errors.category_id = 'Bunday kategoriya yo‘q. Ro‘yxatdan tanlang.';
    else if (data.brand && category.brand !== data.brand) errors.category_id = 'Bu kategoriya boshqa brendga tegishli.';
    else data.category_id = category.id;
  }

  data.badge_new = flag(input.badge_new);
  data.badge_hit = flag(input.badge_hit);
  data.featured = flag(input.featured);
  data.visible = flag(input.visible);

  data.dest_type = DEST_TYPES.includes(input.dest_type) ? input.dest_type : 'default';

  data.uzum_url = '';
  const uzum = line(input.uzum_url);
  if (uzum) {
    const parsed = parseHttpUrl(uzum);
    if (!parsed || parsed.length > 600) errors.uzum_url = 'Havola noto‘g‘ri. Masalan: https://uzum.uz/uz/product/...';
    else data.uzum_url = parsed;
  }

  data.channel_url = '';
  const channel = line(input.channel_url);
  if (channel) {
    const parsed = parseTelegram(channel);
    if (!parsed) errors.channel_url = 'Telegram havolasi noto‘g‘ri. Masalan: @kanal yoki https://t.me/kanal/123';
    else data.channel_url = parsed.url;
  }

  data.dm_username = '';
  const dm = line(input.dm_username);
  if (dm) {
    const parsed = parseTelegram(dm);
    if (!parsed || parsed.kind !== 'username') errors.dm_username = 'Username noto‘g‘ri. Masalan: @lootbox_admin';
    else data.dm_username = parsed.username;
  }

  data.art = '';
  const art = line(input.art);
  if (art) {
    if (isArtKey(art)) data.art = art;
    else errors.art = 'Bunday belgi yo‘q.';
  }

  let imageIds = [];
  if (input.image_ids != null) {
    if (!Array.isArray(input.image_ids)) errors.image_ids = 'Rasmlar ro‘yxati noto‘g‘ri.';
    else {
      imageIds = [...new Set(input.image_ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
      if (imageIds.length > LIMITS.images) errors.image_ids = `Bitta tovarga eng ko‘pi ${LIMITS.images} ta rasm qo‘shiladi.`;
    }
  }

  return { data, imageIds, errors, ok: Object.keys(errors).length === 0 };
}

// ---- Kategoriya --------------------------------------------------------------

export function cleanCategory(input = {}) {
  const errors = {};
  const data = {};

  data.brand = brandOf(errors, input.brand);

  data.name = line(input.name);
  if (!data.name) errors.name = 'Kategoriya nomini yozing.';
  else tooLong(errors, 'name', data.name, LIMITS.categoryName, 'Nom');

  const slug = line(input.slug);
  data.slug = slug ? slugify(slug, 'kategoriya') : '';

  data.tagline = line(input.tagline);
  tooLong(errors, 'tagline', data.tagline, LIMITS.categoryTagline, 'Izoh');

  seoFields(errors, data, input);
  data.intro = block(input.intro);
  tooLong(errors, 'intro', data.intro, LIMITS.categoryIntro, 'Kirish matni');

  const art = line(input.art) || 'box';
  if (isArtKey(art)) data.art = art;
  else errors.art = 'Bunday belgi yo‘q.';

  data.image_id = imageId(errors, 'image_id', input.image_id);
  data.visible = flag(input.visible);

  return { data, errors, ok: Object.keys(errors).length === 0 };
}

// ---- Hero slayd --------------------------------------------------------------

export function cleanSlide(input = {}) {
  const errors = {};
  const data = {};

  data.brand = brandOf(errors, input.brand);

  data.kicker = line(input.kicker);
  tooLong(errors, 'kicker', data.kicker, LIMITS.slideKicker, 'Kichik sarlavha');

  data.title = line(input.title);
  if (!data.title) errors.title = 'Slayd sarlavhasini yozing.';
  else tooLong(errors, 'title', data.title, LIMITS.slideTitle, 'Sarlavha');

  data.subtitle = line(input.subtitle);
  tooLong(errors, 'subtitle', data.subtitle, LIMITS.slideSubtitle, 'Matn');

  data.cta_label = line(input.cta_label);
  tooLong(errors, 'cta_label', data.cta_label, LIMITS.slideCta, 'Tugma matni');

  data.link_type = LINK_TYPES.includes(input.link_type) ? input.link_type : 'catalog';
  data.link_value = '';
  const value = line(input.link_value);
  if (data.link_type === 'category') {
    const id = Number(value);
    const category = Number.isInteger(id) && id > 0 ? getCategory(id) : null;
    if (!category) errors.link_value = 'Kategoriyani tanlang.';
    else if (data.brand && category.brand !== data.brand) errors.link_value = 'Bu kategoriya boshqa brendga tegishli.';
    else data.link_value = String(category.id);
  } else if (data.link_type === 'product') {
    const id = Number(value);
    const product = Number.isInteger(id) && id > 0 ? getProduct(id) : null;
    if (!product) errors.link_value = 'Tovarni tanlang.';
    else if (data.brand && product.brand !== data.brand) errors.link_value = 'Bu tovar boshqa brendga tegishli.';
    else data.link_value = String(product.id);
  } else if (data.link_type === 'url') {
    if (!value) errors.link_value = 'Havolani yozing.';
    else if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/\s/.test(value) && value.length <= 300) data.link_value = value;
    else {
      const parsed = parseHttpUrl(value);
      if (!parsed || parsed.length > 600) errors.link_value = 'Havola noto‘g‘ri. Masalan: /katalog yoki https://t.me/kanal';
      else data.link_value = parsed;
    }
  }

  data.image_id = imageId(errors, 'image_id', input.image_id);

  const art = line(input.art) || 'box';
  if (isArtKey(art)) data.art = art;
  else errors.art = 'Bunday belgi yo‘q.';

  data.tone = '';
  const tone = line(input.tone);
  if (tone) {
    const list = TONES[data.brand === 'fit' ? 'fit' : 'lootbox'];
    if (list.some((item) => item.key === tone)) data.tone = tone;
    // boshqa brendning rangi bo'lsa — avtomatik rangga qaytadi
  }

  data.visible = flag(input.visible);

  return { data, errors, ok: Object.keys(errors).length === 0 };
}

// ---- Sozlamalar --------------------------------------------------------------

const SOCIAL_HANDLE = /^@?[A-Za-z0-9._]{2,30}$/;
const SOCIAL_BASE = {
  instagram: (handle) => `https://www.instagram.com/${handle}/`,
  tiktok: (handle) => `https://www.tiktok.com/@${handle}`,
  youtube: (handle) => `https://www.youtube.com/@${handle}`,
};

function socialUrl(errors, key, value) {
  const text = line(value);
  if (!text) return '';
  if (SOCIAL_HANDLE.test(text) && !text.includes('..')) {
    const handle = text.replace(/^@/, '');
    // "instagram.com" kabi domen yozilgan bo'lsa — havola deb qabul qilamiz
    if (!/\.(com|uz|ru|org|net|me|tv)$/i.test(handle)) return SOCIAL_BASE[key](handle);
  }
  const parsed = parseHttpUrl(text);
  if (!parsed || parsed.length > 300) {
    errors[key] = 'Havola noto‘g‘ri. To‘liq havolani yoki @nomni yozing.';
    return '';
  }
  return parsed;
}

function lines(errors, key, value, { maxLines, maxLength, label }) {
  const rows = strip(value)
    .split('\n')
    .map((row) => row.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (rows.length > maxLines) errors[key] = `${label}: eng ko‘pi ${maxLines} ta qator.`;
  else if (rows.some((row) => row.length > maxLength)) errors[key] = `${label}: har bir qator ${maxLength} belgidan oshmasin.`;
  return rows.join('\n');
}

function limited(errors, key, value, max, label, multiline = false) {
  const text = multiline ? block(value) : line(value);
  tooLong(errors, key, text, max, label);
  return text;
}

/**
 * Faqat kelgan kalitlar tekshiriladi (qolgan sozlamalar o'zgarmaydi).
 * @returns {{ patch: Record<string,string>, errors: Record<string,string>, ok: boolean }}
 */
export function cleanSettings(input = {}) {
  const errors = {};
  const patch = {};
  const has = (key) => Object.hasOwn(input, key) && Object.hasOwn(SETTING_DEFAULTS, key);

  if (has('default_dest')) {
    if (DEST_ORDER.includes(input.default_dest)) patch.default_dest = input.default_dest;
    else errors.default_dest = 'Standart yo‘nalishni tanlang.';
  }

  for (const key of ['uzum_shop_lootbox', 'uzum_shop_fit']) {
    if (!has(key)) continue;
    const text = line(input[key]);
    if (!text) patch[key] = '';
    else {
      const parsed = parseHttpUrl(text);
      if (!parsed || parsed.length > 600) errors[key] = 'Havola noto‘g‘ri. Masalan: https://uzum.uz/uz/shop/lootbox';
      else patch[key] = parsed;
    }
  }

  if (has('tg_channel')) {
    const text = line(input.tg_channel);
    if (!text) patch.tg_channel = '';
    else {
      const parsed = parseTelegram(text);
      if (!parsed) errors.tg_channel = 'Telegram havolasi noto‘g‘ri. Masalan: @lootbox_uz yoki https://t.me/lootbox_uz';
      else patch.tg_channel = parsed.kind === 'username' ? `@${parsed.username}` : parsed.url;
    }
  }

  if (has('tg_dm')) {
    const text = line(input.tg_dm);
    if (!text) patch.tg_dm = '';
    else {
      const parsed = parseTelegram(text);
      if (!parsed || parsed.kind !== 'username') errors.tg_dm = 'Username noto‘g‘ri. Masalan: @lootbox_admin';
      else patch.tg_dm = `@${parsed.username}`;
    }
  }

  if (has('dm_template')) patch.dm_template = limited(errors, 'dm_template', input.dm_template, 300, 'Xabar matni');

  for (const key of ['instagram', 'tiktok', 'youtube']) {
    if (has(key)) patch[key] = socialUrl(errors, key, input[key]);
  }

  if (has('card_click')) {
    if (input.card_click === 'page' || input.card_click === 'direct') patch.card_click = input.card_click;
    else errors.card_click = 'Variantlardan birini tanlang.';
  }
  for (const key of ['show_prices', 'show_other_links']) {
    if (has(key)) patch[key] = flag(input[key]) ? '1' : '0';
  }
  if (has('motion')) {
    if (input.motion === 'full' || input.motion === 'auto') patch.motion = input.motion;
    else errors.motion = 'Variantlardan birini tanlang.';
  }

  for (const key of ['ticker_lootbox', 'ticker_fit']) {
    if (has(key)) patch[key] = lines(errors, key, input[key], { maxLines: 12, maxLength: 80, label: 'Yuguruvchi lenta' });
  }
  for (const key of ['about_lootbox', 'about_fit']) {
    if (has(key)) patch[key] = limited(errors, key, input[key], 600, 'Brend haqida matn', true).replace(/\n+/g, ' ');
  }
  for (const key of ['seo_title_lootbox', 'seo_title_fit']) {
    if (has(key)) patch[key] = limited(errors, key, input[key], 120, 'Sarlavha');
  }
  for (const key of ['seo_desc_lootbox', 'seo_desc_fit']) {
    if (has(key)) patch[key] = limited(errors, key, input[key], 300, 'Tavsif');
  }

  // Saytni tasdiqlash kodlari: Google Search Console va Yandex Webmaster bergan <meta ...> tegini to'liq qo'yish ham
  // mumkin — ichidan kodning o'zi olinadi
  for (const key of ['google_verification', 'yandex_verification']) {
    if (!has(key)) continue;
    const text = line(input[key]);
    const code = (text.match(/content\s*=\s*["']?([A-Za-z0-9_-]+)/i) || [])[1] || text;
    if (!code) patch[key] = '';
    else if (/^[A-Za-z0-9_-]{8,128}$/.test(code)) patch[key] = code;
    else errors[key] = 'Kod noto‘g‘ri. Qidiruv tizimi bergan tegdagi content="..." ichidagi qiymatni qo‘ying.';
  }
  if (has('indexnow')) patch.indexnow = flag(input.indexnow) ? '1' : '0';

  for (const key of Object.keys(errors)) delete patch[key];
  return { patch, errors, ok: Object.keys(errors).length === 0 };
}
