// Saytning qidiruv tizimlariga ko'rsatiladigan sahifalari ro'yxati: sitemap.xml va IndexNow shundan foydalanadi.
import { listProducts, listCategories } from '../db/repo.js';
import { BRANDS } from './brand.js';
import { categoryUrl, productUrl } from './context.js';

/** Bo'limda saytda ko'rinadigan tovar bormi (bo'sh bo'lim qidiruvga berilmaydi) */
export const brandHasProducts = (brandKey) => listProducts({ brand: brandKey, visibleOnly: true, limit: 1 }).length > 0;

/**
 * @returns {{ path: string, lastmod: number }[]} lastmod — sahifa oxirgi marta o'zgargan vaqt (ms), noma'lum bo'lsa 0
 */
export function siteEntries() {
  const entries = [];
  for (const brand of Object.values(BRANDS)) {
    const products = listProducts({ brand: brand.key, visibleOnly: true });
    // Tovarsiz bo'lim («Tovarlar tez orada») qidiruv tizimiga berilmaydi: bo'sh sahifa saytning bahosini tushiradi.
    // Asosiy bosh sahifa esa har doim ro'yxatda turadi.
    if (!products.length && brand.home !== '/') continue;
    const latest = products.reduce((max, item) => Math.max(max, item.updated_at || 0), 0);
    entries.push({ path: brand.home, lastmod: latest });
    if (!products.length) continue;
    entries.push({ path: brand.catalog, lastmod: latest });
    for (const cat of listCategories({ brand: brand.key, visibleOnly: true })) {
      const own = products.filter((item) => item.category_id === cat.id);
      if (!own.length) continue;
      entries.push({
        path: categoryUrl(brand.key, cat),
        lastmod: own.reduce((max, item) => Math.max(max, item.updated_at || 0), cat.updated_at || 0),
      });
    }
    for (const product of products) entries.push({ path: productUrl(product), lastmod: product.updated_at || 0 });
  }
  return entries;
}
