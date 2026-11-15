// Ma'lumotlar bilan ishlash: sayt va admin shu funksiyalar orqali o'qiydi/yozadi.
// Qatorlar bazadagi ustun nomlari bilan qaytadi (snake_case), ustiga:
//   product.images   — [{ id, url, thumb_url, thumb_width, width, height, color, cutout }]
//   product.category — { id, slug, name, art } yoki null
import { all, get, run, tx, allDynamic, runDynamic, placeholders, now } from './index.js';
import { removeImageFiles } from '../lib/images.js';
import { slugify } from '../lib/text.js';

// ---- Sozlamalar ------------------------------------------------------------

export const SETTING_DEFAULTS = Object.freeze({
  // Havolalar
  default_dest: 'uzum', // 'uzum' | 'channel' | 'dm'
  uzum_shop_lootbox: '',
  uzum_shop_fit: '',
  tg_channel: '',
  tg_dm: '',
  dm_template: 'Assalomu alaykum! «{nom}» haqida so‘ramoqchi edim.',
  // Ijtimoiy tarmoqlar
  instagram: '',
  tiktok: '',
  youtube: '',
  // Ko'rinish
  card_click: 'page', // 'page' — tovar sahifasi, 'direct' — to'g'ridan-to'g'ri havolaga
  show_prices: '1',
  show_other_links: '1',
  // 'full' — animatsiyalar har doim to'liq; 'auto' — qurilmasida animatsiyalar o'chirilgan
  // tashrif buyuruvchiga sayt tinch (harakatsiz) ko'rsatiladi
  motion: 'full',
  // Matnlar
  ticker_lootbox: '',
  ticker_fit: '',
  about_lootbox: '',
  about_fit: '',
  seo_title_lootbox: '',
  seo_desc_lootbox: '',
  seo_title_fit: '',
  seo_desc_fit: '',
});

let settingsCache = null;

export function getSettings() {
  if (!settingsCache) {
    const out = { ...SETTING_DEFAULTS };
    for (const row of all('SELECT key, value FROM settings')) {
      if (Object.hasOwn(out, row.key)) out[row.key] = row.value;
    }
    settingsCache = Object.freeze(out);
  }
  return settingsCache;
}

export function saveSettings(patch) {
  tx(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.hasOwn(SETTING_DEFAULTS, key)) continue;
      run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        String(value ?? ''),
      );
    }
  });
  settingsCache = null;
}

/** Ichki belgilar (masalan, demo ma'lumot yozilganmi). Kalitlar "_" bilan boshlanadi. */
export const getMeta = (key) => get('SELECT value FROM settings WHERE key = ?', `_${key}`)?.value ?? null;
export const setMeta = (key, value) =>
  run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    `_${key}`,
    String(value),
  );

// ---- Rasmlar ---------------------------------------------------------------

export function mapImage(row) {
  if (!row || row.id == null) return null;
  return {
    id: row.id,
    url: `/media/${row.file}`,
    thumb_url: `/media/${row.thumb}`,
    width: row.width,
    height: row.height,
    // Kichik nusxaning kengligi; eski yozuvlarda yo'q (null) — sayt uni o'zi hisoblaydi
    thumb_width: row.thumb_width || null,
    color: row.color || '',
    // Fonsiz rasm (tovarning o'zi kesib olingan): kesilmasdan, kartochka foni ustida ko'rsatiladi
    cutout: Boolean(row.cutout),
  };
}

export function insertImage(meta) {
  const info = run(
    'INSERT INTO images (file, thumb, thumb_width, mime, width, height, bytes, color, cutout, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    meta.file,
    meta.thumb,
    meta.thumb_width || null,
    meta.mime,
    meta.width,
    meta.height,
    meta.bytes,
    meta.color || '',
    meta.cutout ? 1 : 0,
    now(),
  );
  return getImage(Number(info.lastInsertRowid));
}

export const getImage = (id) => mapImage(get('SELECT * FROM images WHERE id = ?', id));

export function existingImageIds(ids) {
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!clean.length) return [];
  const found = new Set(
    allDynamic(`SELECT id FROM images WHERE id IN (${placeholders(clean)})`, clean).map((row) => row.id),
  );
  return clean.filter((id) => found.has(id));
}

const IMAGE_IN_USE = `
  EXISTS (SELECT 1 FROM product_images WHERE image_id = images.id)
  OR EXISTS (SELECT 1 FROM categories WHERE image_id = images.id)
  OR EXISTS (SELECT 1 FROM slides WHERE image_id = images.id)`;

/** Hech qayerda ishlatilmayotgan rasmlarni (bazadan va diskdan) o'chiradi. */
export function deleteOrphanImages({ ids = null, olderThanMs = 0 } = {}) {
  let rows;
  if (ids) {
    const clean = [...new Set(ids.map(Number).filter(Number.isInteger))];
    if (!clean.length) return 0;
    rows = allDynamic(
      `SELECT * FROM images WHERE id IN (${placeholders(clean)}) AND NOT (${IMAGE_IN_USE})`,
      clean,
    );
  } else {
    rows = all(`SELECT * FROM images WHERE created_at <= ? AND NOT (${IMAGE_IN_USE})`, now() - olderThanMs);
  }
  for (const row of rows) {
    run('DELETE FROM images WHERE id = ?', row.id);
    removeImageFiles(row);
  }
  return rows.length;
}

// ---- Kategoriyalar ---------------------------------------------------------

const CATEGORY_SELECT = `
  SELECT c.*,
    i.file AS image_file, i.thumb AS image_thumb, i.thumb_width AS image_thumb_width, i.width AS image_width, i.height AS image_height, i.color AS image_color, i.cutout AS image_cutout,
    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_total,
    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.visible = 1) AS product_count
  FROM categories c LEFT JOIN images i ON i.id = c.image_id`;

function mapCategory(row) {
  if (!row) return null;
  const { image_file, image_thumb, image_thumb_width, image_width, image_height, image_color, image_cutout, ...rest } = row;
  rest.image = image_file
    ? mapImage({ id: row.image_id, file: image_file, thumb: image_thumb, thumb_width: image_thumb_width, width: image_width, height: image_height, color: image_color, cutout: image_cutout })
    : null;
  return rest;
}

export function listCategories({ brand = null, visibleOnly = false } = {}) {
  const where = [];
  const params = [];
  if (brand) {
    where.push('c.brand = ?');
    params.push(brand);
  }
  if (visibleOnly) where.push('c.visible = 1');
  const sql = `${CATEGORY_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.brand DESC, c.sort ASC, c.id ASC`;
  return allDynamic(sql, params).map(mapCategory);
}

export const getCategory = (id) => mapCategory(get(`${CATEGORY_SELECT} WHERE c.id = ?`, id));
export const getCategoryBySlug = (brand, slug) =>
  mapCategory(get(`${CATEGORY_SELECT} WHERE c.brand = ? AND c.slug = ?`, brand, slug));

function uniqueCategorySlug(brand, base, excludeId = 0) {
  let slug = base;
  for (let n = 2; get('SELECT 1 AS x FROM categories WHERE brand = ? AND slug = ? AND id != ?', brand, slug, excludeId); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

const CATEGORY_FIELDS = ['brand', 'name', 'tagline', 'art', 'image_id', 'visible'];

export function createCategory(data) {
  return tx(() => {
    const ts = now();
    const slug = uniqueCategorySlug(data.brand, data.slug || slugify(data.name, 'kategoriya'));
    const sort = (get('SELECT MAX(sort) AS m FROM categories WHERE brand = ?', data.brand).m ?? 0) + 1;
    const cols = [...CATEGORY_FIELDS, 'slug', 'sort', 'is_demo', 'created_at', 'updated_at'];
    const values = [...CATEGORY_FIELDS.map((f) => data[f] ?? null), slug, sort, data.is_demo ? 1 : 0, ts, ts];
    const info = runDynamic(`INSERT INTO categories (${cols.join(',')}) VALUES (${placeholders(cols)})`, values);
    return Number(info.lastInsertRowid);
  });
}

export function updateCategory(id, data) {
  const previous = get('SELECT image_id, brand FROM categories WHERE id = ?', id);
  if (!previous) return false;
  tx(() => {
    const slug = uniqueCategorySlug(data.brand, data.slug || slugify(data.name, 'kategoriya'), id);
    const cols = [...CATEGORY_FIELDS, 'slug', 'updated_at'];
    const values = [...CATEGORY_FIELDS.map((f) => data[f] ?? null), slug, now(), id];
    runDynamic(`UPDATE categories SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, values);
    // Kategoriya boshqa brendga ko'chsa, tovarlari ham birga ko'chadi.
    if (previous.brand !== data.brand) run('UPDATE products SET brand = ? WHERE category_id = ?', data.brand, id);
  });
  if (previous.image_id && previous.image_id !== data.image_id) deleteOrphanImages({ ids: [previous.image_id] });
  return true;
}

export function deleteCategory(id) {
  const previous = get('SELECT image_id FROM categories WHERE id = ?', id);
  if (!previous) return false;
  run('DELETE FROM categories WHERE id = ?', id);
  if (previous.image_id) deleteOrphanImages({ ids: [previous.image_id] });
  return true;
}

export function reorderCategories(ids) {
  tx(() => {
    ids.forEach((id, index) => run('UPDATE categories SET sort = ? WHERE id = ?', index + 1, id));
  });
}

export const patchCategory = (id, field, value) => {
  if (field !== 'visible') return false;
  return run('UPDATE categories SET visible = ?, updated_at = ? WHERE id = ?', value ? 1 : 0, now(), id).changes > 0;
};

// ---- Tovarlar --------------------------------------------------------------

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.art AS category_art, c.visible AS category_visible
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

const PRODUCT_ORDERS = {
  sort: 'p.sort ASC, p.id DESC',
  new: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price IS NULL, p.price ASC, p.sort ASC',
  price_desc: 'p.price IS NULL, p.price DESC, p.sort ASC',
};

function hydrateProducts(rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const imageRows = allDynamic(
    `SELECT pi.product_id, i.* FROM product_images pi JOIN images i ON i.id = pi.image_id
     WHERE pi.product_id IN (${placeholders(ids)}) ORDER BY pi.sort ASC, i.id ASC`,
    ids,
  );
  const byProduct = new Map();
  for (const row of imageRows) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
    byProduct.get(row.product_id).push(mapImage(row));
  }
  return rows.map((row) => {
    const { category_slug, category_name, category_art, category_visible, ...product } = row;
    product.category = row.category_id && category_slug
      ? { id: row.category_id, slug: category_slug, name: category_name, art: category_art, visible: category_visible }
      : null;
    product.images = byProduct.get(row.id) || [];
    return product;
  });
}

/**
 * @param {{ brand?: string, categoryId?: number|'none', visibleOnly?: boolean,
 *   flag?: 'new'|'hit'|'featured', q?: string, limit?: number, excludeId?: number,
 *   order?: 'sort'|'new'|'price_asc'|'price_desc' }} [filter]
 */
export function listProducts(filter = {}) {
  const { brand, categoryId, visibleOnly = false, flag, q, limit, excludeId, order = 'sort' } = filter;
  const where = [];
  const params = [];
  if (brand) {
    where.push('p.brand = ?');
    params.push(brand);
  }
  if (categoryId === 'none') where.push('p.category_id IS NULL');
  else if (categoryId) {
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  // Yashirilgan kategoriyaning tovarlari ham saytda ko'rinmaydi.
  if (visibleOnly) where.push('p.visible = 1 AND (c.id IS NULL OR c.visible = 1)');
  if (flag === 'new') where.push('p.badge_new = 1');
  if (flag === 'hit') where.push('p.badge_hit = 1');
  if (flag === 'featured') where.push('p.featured = 1');
  if (excludeId) {
    where.push('p.id != ?');
    params.push(excludeId);
  }
  let sql = `${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${PRODUCT_ORDERS[order] || PRODUCT_ORDERS.sort}`;
  const term = String(q || '').trim().toLowerCase();
  if (limit && !term) {
    sql += ' LIMIT ?';
    params.push(limit);
  }
  let rows = allDynamic(sql, params);
  if (term) {
    rows = rows.filter((row) =>
      [row.name, row.slug, row.tagline, row.category_name].some((value) => String(value || '').toLowerCase().includes(term)),
    );
    if (limit) rows = rows.slice(0, limit);
  }
  return hydrateProducts(rows);
}

export const getProduct = (id) => hydrateProducts(allDynamic(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]))[0] || null;
export const getProductBySlug = (slug) =>
  hydrateProducts(allDynamic(`${PRODUCT_SELECT} WHERE p.slug = ?`, [slug]))[0] || null;

export function countProducts() {
  return all(
    `SELECT brand, COUNT(*) AS total, SUM(visible) AS visible,
       SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = products.id) THEN 1 ELSE 0 END) AS no_photo
     FROM products GROUP BY brand`,
  );
}

function uniqueProductSlug(base, excludeId = 0) {
  let slug = base;
  for (let n = 2; get('SELECT 1 AS x FROM products WHERE slug = ? AND id != ?', slug, excludeId); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

const PRODUCT_FIELDS = [
  'brand', 'category_id', 'name', 'tagline', 'description', 'features', 'price', 'old_price',
  'badge_new', 'badge_hit', 'featured', 'visible', 'dest_type', 'uzum_url', 'channel_url', 'dm_username', 'art',
];

function setProductImages(productId, imageIds) {
  const previous = all('SELECT image_id FROM product_images WHERE product_id = ?', productId).map((row) => row.image_id);
  const next = existingImageIds(imageIds);
  run('DELETE FROM product_images WHERE product_id = ?', productId);
  next.forEach((imageId, index) => {
    run('INSERT INTO product_images (product_id, image_id, sort) VALUES (?, ?, ?)', productId, imageId, index);
  });
  return previous.filter((id) => !next.includes(id));
}

export function createProduct(data, imageIds = []) {
  return tx(() => {
    const ts = now();
    const slug = uniqueProductSlug(data.slug || slugify(data.name));
    // Yangi tovar ro'yxat boshida turadi.
    const sort = (get('SELECT MIN(sort) AS m FROM products WHERE brand = ?', data.brand).m ?? 1) - 1;
    const cols = [...PRODUCT_FIELDS, 'slug', 'sort', 'is_demo', 'created_at', 'updated_at'];
    const values = [...PRODUCT_FIELDS.map((f) => data[f] ?? null), slug, data.sort ?? sort, data.is_demo ? 1 : 0, ts, ts];
    const info = runDynamic(`INSERT INTO products (${cols.join(',')}) VALUES (${placeholders(cols)})`, values);
    const id = Number(info.lastInsertRowid);
    setProductImages(id, imageIds);
    return id;
  });
}

export function updateProduct(id, data, imageIds) {
  if (!get('SELECT 1 AS x FROM products WHERE id = ?', id)) return false;
  const removed = tx(() => {
    const slug = uniqueProductSlug(data.slug || slugify(data.name), id);
    const cols = [...PRODUCT_FIELDS, 'slug', 'updated_at'];
    const values = [...PRODUCT_FIELDS.map((f) => data[f] ?? null), slug, now(), id];
    runDynamic(`UPDATE products SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, values);
    return Array.isArray(imageIds) ? setProductImages(id, imageIds) : [];
  });
  if (removed.length) deleteOrphanImages({ ids: removed });
  return true;
}

const PATCHABLE = new Set(['visible', 'badge_new', 'badge_hit', 'featured']);

export function patchProduct(id, field, value) {
  if (!PATCHABLE.has(field)) return false;
  return run(`UPDATE products SET ${field} = ?, updated_at = ? WHERE id = ?`, value ? 1 : 0, now(), id).changes > 0;
}

export function deleteProduct(id) {
  const imageIds = all('SELECT image_id FROM product_images WHERE product_id = ?', id).map((row) => row.image_id);
  const done = run('DELETE FROM products WHERE id = ?', id).changes > 0;
  if (done && imageIds.length) deleteOrphanImages({ ids: imageIds });
  return done;
}

export function duplicateProduct(id) {
  const source = get('SELECT * FROM products WHERE id = ?', id);
  if (!source) return null;
  const imageIds = all('SELECT image_id FROM product_images WHERE product_id = ? ORDER BY sort', id).map((row) => row.image_id);
  const copy = { ...source, name: `${source.name} (nusxa)`, slug: '', visible: 0, is_demo: 0, sort: source.sort };
  return createProduct(copy, imageIds);
}

export function reorderProducts(ids) {
  tx(() => {
    ids.forEach((id, index) => run('UPDATE products SET sort = ? WHERE id = ?', index + 1, id));
  });
}

// ---- Hero slaydlar ---------------------------------------------------------

const SLIDE_SELECT = `
  SELECT s.*, i.file AS image_file, i.thumb AS image_thumb, i.thumb_width AS image_thumb_width, i.width AS image_width, i.height AS image_height, i.color AS image_color, i.cutout AS image_cutout
  FROM slides s LEFT JOIN images i ON i.id = s.image_id`;

function mapSlide(row) {
  if (!row) return null;
  const { image_file, image_thumb, image_thumb_width, image_width, image_height, image_color, image_cutout, ...rest } = row;
  rest.image = image_file
    ? mapImage({ id: row.image_id, file: image_file, thumb: image_thumb, thumb_width: image_thumb_width, width: image_width, height: image_height, color: image_color, cutout: image_cutout })
    : null;
  return rest;
}

export function listSlides({ brand = null, visibleOnly = false } = {}) {
  const where = [];
  const params = [];
  if (brand) {
    where.push('s.brand = ?');
    params.push(brand);
  }
  if (visibleOnly) where.push('s.visible = 1');
  const sql = `${SLIDE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY s.brand DESC, s.sort ASC, s.id ASC`;
  return allDynamic(sql, params).map(mapSlide);
}

export const getSlide = (id) => mapSlide(get(`${SLIDE_SELECT} WHERE s.id = ?`, id));

const SLIDE_FIELDS = ['brand', 'kicker', 'title', 'subtitle', 'cta_label', 'link_type', 'link_value', 'image_id', 'art', 'tone', 'visible'];

export function createSlide(data) {
  const ts = now();
  const sort = (get('SELECT MAX(sort) AS m FROM slides WHERE brand = ?', data.brand).m ?? 0) + 1;
  const cols = [...SLIDE_FIELDS, 'sort', 'is_demo', 'created_at', 'updated_at'];
  const values = [...SLIDE_FIELDS.map((f) => data[f] ?? null), sort, data.is_demo ? 1 : 0, ts, ts];
  const info = runDynamic(`INSERT INTO slides (${cols.join(',')}) VALUES (${placeholders(cols)})`, values);
  return Number(info.lastInsertRowid);
}

export function updateSlide(id, data) {
  const previous = get('SELECT image_id FROM slides WHERE id = ?', id);
  if (!previous) return false;
  const cols = [...SLIDE_FIELDS, 'updated_at'];
  const values = [...SLIDE_FIELDS.map((f) => data[f] ?? null), now(), id];
  runDynamic(`UPDATE slides SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, values);
  if (previous.image_id && previous.image_id !== data.image_id) deleteOrphanImages({ ids: [previous.image_id] });
  return true;
}

export function deleteSlide(id) {
  const previous = get('SELECT image_id FROM slides WHERE id = ?', id);
  if (!previous) return false;
  run('DELETE FROM slides WHERE id = ?', id);
  if (previous.image_id) deleteOrphanImages({ ids: [previous.image_id] });
  return true;
}

export function reorderSlides(ids) {
  tx(() => {
    ids.forEach((id, index) => run('UPDATE slides SET sort = ? WHERE id = ?', index + 1, id));
  });
}

export const patchSlide = (id, field, value) => {
  if (field !== 'visible') return false;
  return run('UPDATE slides SET visible = ?, updated_at = ? WHERE id = ?', value ? 1 : 0, now(), id).changes > 0;
};

// ---- Statistika (ko'rishlar va tugma bosishlar) ------------------------------

const TASHKENT_OFFSET_MS = 5 * 3_600_000;
export const dayKey = (ts = now()) => new Date(ts + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);

export const STAT_KINDS = ['view', 'uzum', 'channel', 'dm'];

export function trackEvent(productId, kind) {
  if (!STAT_KINDS.includes(kind)) return false;
  try {
    run(
      `INSERT INTO stats_daily (day, product_id, kind, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, product_id, kind) DO UPDATE SET count = count + 1`,
      dayKey(),
      productId,
      kind,
    );
    return true;
  } catch {
    return false; // bunday tovar yo'q
  }
}

/** Oxirgi N kun: kunlik qator + jami + eng ko'p bosilgan tovarlar. */
export function statsSummary(days = 14) {
  const since = dayKey(now() - (days - 1) * 86_400_000);
  const rows = all('SELECT day, kind, SUM(count) AS n FROM stats_daily WHERE day >= ? GROUP BY day, kind', since);
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    series.push({ day: dayKey(now() - i * 86_400_000), view: 0, uzum: 0, channel: 0, dm: 0 });
  }
  const byDay = new Map(series.map((item) => [item.day, item]));
  const totals = { view: 0, uzum: 0, channel: 0, dm: 0 };
  for (const row of rows) {
    const item = byDay.get(row.day);
    if (!item || !Object.hasOwn(totals, row.kind)) continue;
    item[row.kind] = row.n;
    totals[row.kind] += row.n;
  }
  const top = all(
    `SELECT p.id, p.name, p.slug, p.brand,
       SUM(CASE WHEN s.kind = 'view' THEN s.count ELSE 0 END) AS views,
       SUM(CASE WHEN s.kind != 'view' THEN s.count ELSE 0 END) AS clicks
     FROM stats_daily s JOIN products p ON p.id = s.product_id
     WHERE s.day >= ? GROUP BY p.id ORDER BY clicks DESC, views DESC LIMIT 8`,
    since,
  );
  return { days, series, totals, top };
}

// ---- Demo ma'lumot ---------------------------------------------------------

export function demoCounts() {
  return {
    products: get('SELECT COUNT(*) AS n FROM products WHERE is_demo = 1').n,
    categories: get('SELECT COUNT(*) AS n FROM categories WHERE is_demo = 1').n,
    slides: get('SELECT COUNT(*) AS n FROM slides WHERE is_demo = 1').n,
  };
}

/** Demo tovar, slayd va (ichida o'z tovaringiz bo'lmagan) demo kategoriyalarni o'chiradi. */
export function clearDemo() {
  const imageIds = all(
    `SELECT image_id FROM product_images WHERE product_id IN (SELECT id FROM products WHERE is_demo = 1)
     UNION SELECT image_id FROM slides WHERE is_demo = 1 AND image_id IS NOT NULL
     UNION SELECT image_id FROM categories WHERE is_demo = 1 AND image_id IS NOT NULL`,
  ).map((row) => row.image_id);
  const result = tx(() => {
    const products = run('DELETE FROM products WHERE is_demo = 1').changes;
    const slides = run('DELETE FROM slides WHERE is_demo = 1').changes;
    const categories = run(
      'DELETE FROM categories WHERE is_demo = 1 AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = categories.id)',
    ).changes;
    run('UPDATE categories SET is_demo = 0 WHERE is_demo = 1');
    // Jadval butunlay bo'shagan bo'lsa, raqamlash yana 1 dan boshlanadi.
    for (const table of ['products', 'slides', 'categories']) {
      if (get(`SELECT COUNT(*) AS n FROM ${table}`).n === 0) run('DELETE FROM sqlite_sequence WHERE name = ?', table);
    }
    return { products, slides, categories };
  });
  if (imageIds.length) deleteOrphanImages({ ids: imageIds });
  return result;
}
