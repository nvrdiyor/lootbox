// Har bir sahifa so'rovi uchun umumiy ma'lumot: til, brend, sozlamalar, havolalar.
import { config } from '../config.js';
import { dictionary, DEFAULT_LOCALE, localized } from '../i18n/index.js';
import { getSettings, listCategories } from '../db/repo.js';
import { brandLinks } from '../lib/links.js';
import { assetVersion } from '../lib/static.js';
import { currentSession } from '../lib/auth.js';
import { brandOf } from './brand.js';

export function asset(urlPath) {
  return `/static/${urlPath}?v=${assetVersion(config.publicDir, urlPath, config.dev)}`;
}

function requestOrigin(c) {
  if (config.siteUrl) return config.siteUrl;
  const url = new URL(c.req.url);
  let proto = url.protocol.replace(':', '');
  let host = c.req.header('host') || url.host;
  if (config.trustProxy) {
    proto = (c.req.header('x-forwarded-proto') || proto).split(',')[0].trim();
    host = (c.req.header('x-forwarded-host') || host).split(',')[0].trim();
  }
  return `${proto}://${host}`;
}

export function makeContext(c, brandKey) {
  const settings = getSettings();
  const locale = DEFAULT_LOCALE;
  const brand = brandOf(brandKey);
  const url = new URL(c.req.url);
  // Bo'sh kategoriyalar saytda ko'rsatilmaydi.
  const categories = listCategories({ brand: brand.key, visibleOnly: true }).filter((cat) => cat.product_count > 0);
  return {
    c,
    dev: config.dev,
    locale,
    t: dictionary(locale),
    tr: (row, field) => localized(row, field, locale),
    brand,
    settings,
    categories,
    links: brandLinks(brand.key, settings),
    path: url.pathname,
    query: url.searchParams,
    origin: requestOrigin(c),
    showPrices: settings.show_prices !== '0',
    // Admin panelga kirgan odamga saytda "Admin" tugmachasi ko'rinadi
    isAdmin: Boolean(currentSession(c)),
  };
}

// ---- Manzillar -------------------------------------------------------------

export const productUrl = (product) => `/tovar/${product.slug}`;
export const categoryUrl = (brand, category) => `${brandOf(brand).catalog}/${category.slug}`;
export const catalogUrl = (brand) => brandOf(brand).catalog;
