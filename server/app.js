import { Hono } from 'hono';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { config } from './config.js';
import { sendFile, IMMUTABLE, REVALIDATE } from './lib/static.js';
import { isMediaName } from './lib/images.js';
import { hostAllowed } from './lib/hosts.js';
import { mountLiveReload } from './dev/livereload.js';
import { mountArtPreview } from './dev/art-preview.js';
import { mountOgPreview } from './dev/og-preview.js';
import { mountSite, renderNotFound } from './site/routes.js';
import { mountAdmin } from './admin/routes.js';

// Brauzerga: faqat o'z saytimizdagi skript/uslub/rasm ishlasin, sayt boshqa sahifa ichiga
// (iframe) joylanmasin.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function createApp() {
  const app = new Hono();

  // Sayt faqat o'z manzili bilan ochiladi (lib/hosts.js): begona Host nomi bilan kelgan so'rov rad etiladi.
  app.use(async (c, next) => {
    const host = c.req.header('host') || new URL(c.req.url).host;
    const forwarded = config.trustProxy ? c.req.header('x-forwarded-host') : null;
    if (!hostAllowed(host) || (forwarded && !hostAllowed(forwarded.split(',')[0]))) {
      return c.text('Bu manzil sayt uchun sozlanmagan. .env faylidagi SITE_URL ni tekshiring.', 400);
    }
    await next();
  });

  app.use(async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (!c.res.headers.has('Content-Security-Policy')) c.header('Content-Security-Policy', CSP);
    // Sahifalar har safar yangidan so'raladi (admin o'zgartirishi darhol ko'rinsin)
    const type = c.res.headers.get('Content-Type') || '';
    if (type.startsWith('text/html') && !c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'private, no-cache');
  });

  app.use(trimTrailingSlash());

  if (config.dev) {
    mountLiveReload(app, { publicDir: config.publicDir });
    mountArtPreview(app);
    mountOgPreview(app);
  }

  // public/ ichidagi fayllar: /static/...
  app.get('/static/*', async (c) => {
    const rel = c.req.path.slice('/static/'.length);
    const cacheControl = rel.startsWith('vendor/') ? IMMUTABLE : config.dev ? 'no-store' : REVALIDATE;
    return (await sendFile(c, config.publicDir, rel, { cacheControl })) || c.notFound();
  });

  // Yuklangan rasmlar: /media/<tasodifiy-nom>.webp — nomi o'zgarmaydi, shuning uchun uzoq keshlanadi
  app.get('/media/:file', async (c) => {
    const file = c.req.param('file');
    if (!isMediaName(file)) return c.notFound();
    return (await sendFile(c, config.uploadsDir, file, { cacheControl: IMMUTABLE })) || c.notFound();
  });

  mountAdmin(app);

  // Rus tili qo'shilganda: mountSite(app, { prefix: '/ru', locale: 'ru' }) ko'rinishida ikkinchi marta ulanadi.
  mountSite(app);

  app.notFound((c) => {
    const path = new URL(c.req.url).pathname;
    if (path.startsWith('/static/') || path.startsWith('/media/') || path.startsWith('/api/') || path.startsWith('/admin/api/')) {
      return c.text('Topilmadi', 404);
    }
    return renderNotFound(c);
  });

  app.onError((err, c) => {
    console.error(`[xato] ${c.req.method} ${c.req.path}\n`, err);
    const path = new URL(c.req.url).pathname;
    if (path.startsWith('/admin/api/') || path.startsWith('/api/')) {
      return c.json({ ok: false, error: 'Serverda xatolik yuz berdi. Qayta urinib ko‘ring.' }, 500);
    }
    return c.text('Serverda xatolik yuz berdi. Sahifani yangilab ko‘ring.', 500);
  });

  return app;
}
