// Haqiqiy katalog (Uzum'dagi LOOTBOX do'koni) bilan ishlash:
//   seedCatalog()         — katalogdagi tovar, kategoriya va slaydlarni bazaga yozadi (borlariga tegmaydi)
//   importCatalogMedia()  — rasmi yo'q katalog tovarlariga loyihadagi fonsiz rasmlarni biriktiradi;
//                           { replace: true } bilan — katalogning o'zi qo'ygan eski rasmlarni yangisiga almashtiradi
// Ikkalasini ham qayta-qayta ishga tushirish xavfsiz: bor narsa takror yozilmaydi.
import fs from 'node:fs';
import path from 'node:path';
import { get, all, run, tx, now } from './index.js';
import { createCategory, createProduct, createSlide, getProduct, updateProduct, insertImage, getMeta, setMeta } from './repo.js';
import { storeImage, ImageError } from '../lib/images.js';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS, CATALOG_SLIDES } from './catalog-data.js';

const findByUzumUrl = (url) => get('SELECT id FROM products WHERE uzum_url = ?', url)?.id ?? null;

/**
 * Katalogni bazaga yozadi. Tovar Uzum havolasi bo'yicha taniladi: shu havolali tovar bor bo'lsa
 * (nomi yoki narxi admin panelda o'zgartirilgan bo'lsa ham) unga tegilmaydi.
 * @returns {{ products: number, categories: number, slides: number }} nechta yangi yozuv qo'shilgani
 */
export function seedCatalog() {
  return tx(() => {
    const added = { products: 0, categories: 0, slides: 0 };

    const categoryIds = new Map();
    for (const item of CATALOG_CATEGORIES) {
      const existing = get('SELECT id FROM categories WHERE brand = ? AND slug = ?', item.brand, item.slug);
      if (existing) {
        categoryIds.set(item.slug, existing.id);
        continue;
      }
      categoryIds.set(item.slug, createCategory({ ...item, visible: 1, is_demo: 0 }));
      added.categories += 1;
    }

    // Yangi tovarlar ro'yxat boshida, katalogdagi tartibda turadi
    const first = get("SELECT MIN(sort) AS m FROM products WHERE brand = 'lootbox'").m ?? 1;
    const base = now();
    const productIds = new Map();
    CATALOG_PRODUCTS.forEach((item, index) => {
      const existing = findByUzumUrl(item.uzum_url);
      if (existing) {
        productIds.set(item.uzum_url, existing);
        return;
      }
      const { category, media, ...data } = item;
      const id = createProduct({
        brand: 'lootbox', tagline: '', description: '', features: '', old_price: null,
        badge_new: 0, badge_hit: 0, featured: 0, channel_url: '', dm_username: '', art: '',
        ...data,
        dest_type: 'default',
        category_id: categoryIds.get(category) ?? null,
        visible: 1,
        is_demo: 0,
        sort: first - CATALOG_PRODUCTS.length + index,
      });
      // "Eng yangi" tartibi ham ro'yxat tartibiga mos bo'lsin
      run('UPDATE products SET created_at = ? WHERE id = ?', base - index * 60_000, id);
      productIds.set(item.uzum_url, id);
      added.products += 1;
    });

    // Slaydlar faqat brendda hali birorta slayd bo'lmasa yoziladi
    const hasSlides = get("SELECT COUNT(*) AS n FROM slides WHERE brand = 'lootbox'").n > 0;
    if (!hasSlides) {
      for (const item of CATALOG_SLIDES) {
        const { category, product, ...data } = item;
        const target = category ? categoryIds.get(category) : productIds.get(product);
        createSlide({ ...data, link_value: target ? String(target) : '', image_id: null, visible: 1, is_demo: 0 });
        added.slides += 1;
      }
    }
    return added;
  });
}

// ---- Rasmlar -----------------------------------------------------------------

// Tovarning fonsiz rasmlari loyihaning o'zida saqlanadi: <nom>.webp (to'liq) va <nom>.t.webp (kichik nusxa).
export const MEDIA_DIR = path.join(import.meta.dirname, 'catalog-media');
const MEDIA_NAME = /^[a-z0-9][a-z0-9-]{1,60}$/;

function readMedia(name) {
  if (!MEDIA_NAME.test(name)) throw new ImageError(`Rasm nomi noto‘g‘ri: ${name}`);
  const full = fs.readFileSync(path.join(MEDIA_DIR, `${name}.webp`));
  const thumbFile = path.join(MEDIA_DIR, `${name}.t.webp`);
  return { full, thumb: fs.existsSync(thumbFile) ? fs.readFileSync(thumbFile) : null };
}

// Katalog qo'ygan rasmlarning identifikatorlari eslab qolinadi: almashtirishda faqat shular almashtiriladi,
// admin paneldan yuklangan rasmlarga tegilmaydi.
const TRACK_KEY = 'catalog_images';
function trackedImages() {
  try {
    const list = JSON.parse(getMeta(TRACK_KEY) || 'null');
    if (Array.isArray(list)) return new Set(list.map(Number));
  } catch {
    // yozuv buzilgan bo'lsa — pastdagi qoida bo'yicha qaytadan tuziladi
  }
  // Ro'yxat hali yuritilmagan baza: tovarning rasmlari soni katalogdagiga teng va hammasi fonsiz bo'lsa,
  // ular katalog qo'ygan rasmlar deb olinadi
  const set = new Set();
  for (const item of CATALOG_PRODUCTS) {
    const id = findByUzumUrl(item.uzum_url);
    if (!id) continue;
    const rows = all(
      'SELECT pi.image_id, i.cutout FROM product_images pi JOIN images i ON i.id = pi.image_id WHERE pi.product_id = ?',
      id,
    );
    if (rows.length && rows.length === (item.media || []).length && rows.every((row) => row.cutout === 1)) {
      for (const row of rows) set.add(row.image_id);
    }
  }
  return set;
}

/**
 * Katalog tovarlariga loyihadagi rasmlarni biriktiradi (data/uploads ga nusxalab).
 * Odatda faqat rasmi yo'q tovarlarga: tovarda bitta bo'lsa ham rasm bo'lsa — tegilmaydi.
 * `replace: true` — loyihadagi rasmlar yangilanganda: tovarning hozirgi rasmlari katalogning o'zi qo'ygan bo'lsa,
 * yangisiga almashtiriladi (eskilari o'chiriladi). Admin yuklagan yoki o'zgartirgan rasmlar `force` siz almashtirilmaydi.
 * @param {{ replace?: boolean, force?: boolean }} [options]
 * @returns {{ products: number, images: number, replaced: number, skipped: number, kept: number, missing: number, failed: { name: string, media: string, error: string }[] }}
 */
export function importCatalogMedia({ replace = false, force = false } = {}) {
  const result = { products: 0, images: 0, replaced: 0, skipped: 0, kept: 0, missing: 0, failed: [] };
  const tracked = trackedImages();
  for (const item of CATALOG_PRODUCTS) {
    const id = findByUzumUrl(item.uzum_url);
    if (!id) {
      result.missing += 1; // tovar o'chirilgan yoki havolasi o'zgartirilgan
      continue;
    }
    const current = all('SELECT image_id FROM product_images WHERE product_id = ? ORDER BY sort', id).map((row) => row.image_id);
    if (current.length) {
      if (!replace) {
        result.skipped += 1;
        continue;
      }
      if (!force && !current.every((imageId) => tracked.has(imageId))) {
        result.kept += 1;
        continue;
      }
    }
    const imageIds = [];
    for (const name of item.media || []) {
      try {
        // storeImage fayl turini baytlardan tekshiradi va shaffofligini (fonsizligini) aniqlaydi
        imageIds.push(insertImage(storeImage(readMedia(name))).id);
      } catch (err) {
        result.failed.push({ name: item.name, media: name, error: String(err?.message || err) });
      }
    }
    if (imageIds.length) {
      updateProduct(id, getProduct(id), imageIds); // eski rasmlar hech qayerda ishlatilmasa, o'chiriladi
      for (const imageId of current) tracked.delete(imageId);
      for (const imageId of imageIds) tracked.add(imageId);
      result.products += 1;
      result.images += imageIds.length;
      if (current.length) result.replaced += 1;
    }
  }
  setMeta(TRACK_KEY, JSON.stringify([...tracked]));
  return result;
}

/** Katalogdagi nechta tovar bazada bor va ulardan nechtasi rasmsiz (server ishga tushganda eslatma uchun). */
export function catalogPhotoStatus() {
  let present = 0;
  let withoutPhotos = 0;
  for (const item of CATALOG_PRODUCTS) {
    const id = findByUzumUrl(item.uzum_url);
    if (!id) continue;
    present += 1;
    if (!get('SELECT 1 AS x FROM product_images WHERE product_id = ?', id)) withoutPhotos += 1;
  }
  return { present, withoutPhotos };
}
