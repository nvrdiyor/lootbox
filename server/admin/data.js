// Admin panelga xos so'rovlar (umumiy repo.js ga tegmasdan).
import { all } from '../db/index.js';
import { reorderProducts, reorderCategories, reorderSlides, listProducts, getSettings } from '../db/repo.js';
import { resolveDestination } from '../lib/links.js';

const ORDER = {
  products: { sql: 'SELECT id FROM products WHERE brand = ? ORDER BY sort ASC, id DESC', apply: reorderProducts },
  categories: { sql: 'SELECT id FROM categories WHERE brand = ? ORDER BY sort ASC, id ASC', apply: reorderCategories },
  slides: { sql: 'SELECT id FROM slides WHERE brand = ? ORDER BY sort ASC, id ASC', apply: reorderSlides },
};

/**
 * Tartibni saqlash. `ids` — ekranda ko'rinib turgan qatorlar (filtr qo'yilgan bo'lishi mumkin)
 * yangi tartibda. Ko'rinmayotgan qatorlar o'z joyida qoladi, ko'rinayotganlari esa o'zlari
 * egallab turgan o'rinlarga yangi tartibda joylashadi.
 * @returns {number[]} brendning to'liq yangi tartibi
 */
export function reorderWithin(kind, brand, ids) {
  const spec = ORDER[kind];
  if (!spec) return [];
  const full = all(spec.sql, brand).map((row) => row.id);
  const known = new Set(full);
  const moved = [...new Set(ids.map(Number))].filter((id) => known.has(id));
  const movedSet = new Set(moved);
  let cursor = 0;
  const next = full.map((id) => (movedSet.has(id) ? moved[cursor++] : id));
  spec.apply(next);
  return next;
}

/** Barcha tovarlar + har birining tugmasi qayerga olib borishi */
export function productsWithDestinations() {
  const settings = getSettings();
  return listProducts({}).map((product) => {
    const dest = resolveDestination(product, settings);
    return { product, dest };
  });
}

/** Bosh sahifadagi "sozlash kerak" ro'yxati uchun sonlar */
export function setupFacts() {
  const settings = getSettings();
  const rows = productsWithDestinations();
  return {
    settings,
    total: rows.length,
    noPhoto: rows.filter(({ product }) => product.images.length === 0).length,
    noDest: rows.filter(({ dest }) => !dest).length,
    hidden: rows.filter(({ product }) => !product.visible).length,
  };
}
