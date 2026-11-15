// Sayt yo'llari:
//   /                    LOOTBOX bosh sahifasi         /fit                    FIT bosh sahifasi
//   /katalog[/kategoriya]                               /fit/katalog[/kategoriya]
//   /tovar/:slug         tovar sahifasi (brendi tovarning o'zidan aniqlanadi)
//   POST /api/track      ko'rish va tugma bosish statistikasi
import { bodyLimit } from 'hono/body-limit';
import { esc } from '../lib/html.js';
import { getProductBySlug, listProducts, listCategories, trackEvent, STAT_KINDS } from '../db/repo.js';
import { clientIp, sameOrigin } from '../lib/auth.js';
import { BRANDS, faviconSvg } from './brand.js';
import { makeContext, productUrl, categoryUrl } from './context.js';
import { homePage } from './pages/home.js';
import { catalogPage } from './pages/catalog.js';
import { productPage } from './pages/product.js';
import { notFoundPage } from './pages/notfound.js';

/** Manzil bo'yicha brendni taxmin qiladi (404 sahifasi to'g'ri rangda chiqishi uchun) */
const brandFromPath = (path) => (path === '/fit' || path.startsWith('/fit/') ? 'fit' : 'lootbox');

export function renderNotFound(c) {
  const ctx = makeContext(c, brandFromPath(new URL(c.req.url).pathname));
  return c.html(notFoundPage(ctx), 404);
}

// Statistika so'rovlarini cheklash: bitta IP'dan daqiqasiga 60 tadan ko'p emas
const hits = new Map();
function trackAllowed(ip) {
  const minute = Math.floor(Date.now() / 60_000);
  const entry = hits.get(ip);
  if (!entry || entry.minute !== minute) {
    hits.delete(ip);
    hits.set(ip, { minute, count: 1 });
    // Xotira cheklangan: ro'yxat to'lsa, eng eski yozuvlar chiqarib tashlanadi
    while (hits.size > 20_000) hits.delete(hits.keys().next().value);
    return true;
  }
  entry.count += 1;
  return entry.count <= 60;
}

export function mountSite(app) {
  for (const brand of Object.values(BRANDS)) {
    app.get(brand.home, (c) => c.html(homePage(makeContext(c, brand.key))));

    app.get(brand.catalog, (c) => c.html(catalogPage(makeContext(c, brand.key), null)));

    app.get(`${brand.catalog}/:category`, (c) => {
      const ctx = makeContext(c, brand.key);
      const category = ctx.categories.find((item) => item.slug === c.req.param('category'));
      if (!category) return renderNotFound(c);
      return c.html(catalogPage(ctx, category));
    });
  }

  app.get('/tovar/:slug', (c) => {
    const product = getProductBySlug(c.req.param('slug'));
    const hidden = !product || !product.visible || (product.category && !product.category.visible);
    if (hidden) return renderNotFound(c);
    return c.html(productPage(makeContext(c, product.brand), product));
  });

  app.post('/api/track', bodyLimit({ maxSize: 1024, onError: (c) => c.body(null, 413) }), async (c) => {
    // Faqat o'z sahifalarimizdan kelgan hodisalar sanaladi (boshqa sayt sonlarni shishira olmasin)
    if (!sameOrigin(c) || !trackAllowed(clientIp(c))) return c.body(null, 204);
    let payload = null;
    try {
      const text = await c.req.text();
      if (text.length <= 200) payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    const id = Number(payload?.id);
    if (Number.isInteger(id) && id > 0 && STAT_KINDS.includes(payload?.kind)) trackEvent(id, payload.kind);
    return c.body(null, 204);
  });

  app.get('/favicon.svg', (c) =>
    c.body(faviconSvg(c.req.query('b') === 'fit' ? 'fit' : 'lootbox'), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    }),
  );
  app.get('/favicon.ico', (c) => c.redirect('/favicon.svg', 302));

  app.get('/robots.txt', (c) => {
    const origin = makeContext(c, 'lootbox').origin;
    return c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (c) => {
    const origin = makeContext(c, 'lootbox').origin;
    const urls = [];
    for (const brand of Object.values(BRANDS)) {
      urls.push(brand.home, brand.catalog);
      for (const cat of listCategories({ brand: brand.key, visibleOnly: true })) {
        if (cat.product_count > 0) urls.push(categoryUrl(brand.key, cat));
      }
    }
    for (const product of listProducts({ visibleOnly: true })) urls.push(productUrl(product));
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((path) => `  <url><loc>${esc(origin + path)}</loc></url>`)
      .join('\n')}\n</urlset>\n`;
    return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
  });
}
