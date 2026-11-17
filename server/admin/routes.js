// Admin panel yo'llari.
//   Sahifalar:  /admin, /admin/products, /admin/products/new, /admin/products/:id,
//               /admin/categories, /admin/slides, /admin/settings, /admin/login
//   API (JSON): /admin/api/...
// Kirish sahifasidan boshqa hamma narsa sessiya talab qiladi; har bir o'zgartiruvchi so'rov
// (POST/PUT/PATCH/DELETE) bundan tashqari Origin va X-CSRF-Token tekshiruvidan o'tadi
// (lib/auth.js dagi requireAdmin).
import { bodyLimit } from 'hono/body-limit';
import { html } from '../lib/html.js';
import {
  passwordConfigured, verifyPassword, clientIp, loginBlockedFor, noteLoginFailure, clearLoginFailures,
  startSession, currentSession, endSession, endAllSessions, sameOrigin, requireAdmin,
} from '../lib/auth.js';
import { IMAGE_LIMITS, ImageError, storeImage, removeImageFiles } from '../lib/images.js';
import { resolveDestination, otherDestinations } from '../lib/links.js';
import { dictionary } from '../i18n/index.js';
import { queueUrls } from '../lib/indexnow.js';
import { brandOf, BRANDS as SITE_BRANDS } from '../site/brand.js';
import { productSeo } from '../site/seo.js';
import { BRANDS } from '../db/schema.js';
import {
  getSettings, saveSettings, insertImage,
  getProduct, createProduct, updateProduct, patchProduct, deleteProduct, duplicateProduct,
  getCategory, createCategory, updateCategory, deleteCategory, patchCategory,
  getSlide, createSlide, updateSlide, deleteSlide, patchSlide,
  clearDemo,
} from '../db/repo.js';
import { reorderWithin } from './data.js';
import { cleanProduct, cleanCategory, cleanSlide, cleanSettings } from './validate.js';
import { shell } from './layout.js';
import { ic } from './icons.js';
import { emptyState } from './ui.js';
import { loginPage } from './pages/login.js';
import { dashboardPage } from './pages/dashboard.js';
import { productsPage } from './pages/products.js';
import { productEditPage } from './pages/product-edit.js';
import { categoriesPage } from './pages/categories.js';
import { slidesPage } from './pages/slides.js';
import { settingsPage } from './pages/settings.js';

const NOT_CONFIGURED =
  'Admin paroli o‘rnatilmagan. Loyiha papkasidagi .env faylida ADMIN_PASSWORD qatoriga kamida 8 belgili parol yozing va serverni qayta ishga tushiring.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Kirgandan keyin qaytiladigan manzil: faqat admin ichidagi oddiy yo'l bo'lishi mumkin */
const NEXT_PATH = /^\/admin(?:[/?#][\w\-/?=&.%#]*)?$/;
function safeNext(value) {
  const next = String(value || '');
  if (next.length > 300 || !NEXT_PATH.test(next) || next.includes('//') || next.startsWith('/admin/login')) return '/admin';
  return next;
}

function tooMany(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Juda ko‘p noto‘g‘ri urinish. ${minutes} daqiqadan keyin qayta urinib ko‘ring.`;
}

const ID = /^[1-9]\d{0,9}$/;
const idOf = (c, name = 'id') => {
  const value = c.req.param(name);
  return ID.test(value || '') ? Number(value) : 0;
};

async function readJson(c) {
  try {
    const data = await c.req.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

const bad = (c, error = 'So‘rov noto‘g‘ri. Sahifani yangilab, qayta urinib ko‘ring.') => c.json({ ok: false, error }, 400);
const missing = (c, error = 'Topilmadi. Balki allaqachon o‘chirilgan.') => c.json({ ok: false, error }, 404);
const invalid = (c, errors) =>
  c.json({ ok: false, error: 'Ba’zi maydonlarda xato bor. Tuzatib, qayta saqlang.', errors }, 422);

const OTHER_LABEL = { uzum: 'otherUzum', channel: 'otherChannel', dm: 'otherDm' };

function productSummary(product) {
  const onSite = Boolean(product.visible && (!product.category || product.category.visible));
  return { id: product.id, slug: product.slug, name: product.name, visible: product.visible, on_site: onSite, url: `/tovar/${product.slug}` };
}

/** Tovarning qidiruvdagi ko'rinishi (muharrirdagi namuna va maydonlardagi avtomatik matnlar yangilanishi uchun) */
function productSeoSummary(product) {
  const settings = getSettings();
  const seo = productSeo({ t: dictionary(), brand: brandOf(product.brand), settings, showPrices: settings.show_prices !== '0' }, product);
  return {
    title: seo.title,
    description: seo.description,
    auto: seo.auto,
    // server tartibga keltirgan qiymatlar (masalan, takrorlangan qidiruv so'zi olib tashlanadi)
    fields: { search_terms: product.search_terms, meta_title: product.meta_title, meta_description: product.meta_description },
  };
}

// ---- O'zgargan sahifalar haqida qidiruv tizimlariga xabar (IndexNow; lokal ishlaganda hech narsa yuborilmaydi)
/** Tovar ko'rinadigan sahifalar: o'zi, kategoriyasi, katalog va bosh sahifa */
function productPaths(product) {
  if (!product) return [];
  const brand = brandOf(product.brand);
  return [`/tovar/${product.slug}`, product.category ? `${brand.catalog}/${product.category.slug}` : null, brand.catalog, brand.home].filter(Boolean);
}
function categoryPaths(category) {
  if (!category) return [];
  const brand = brandOf(category.brand);
  return [`${brand.catalog}/${category.slug}`, brand.catalog, brand.home];
}
const homePaths = () => Object.values(SITE_BRANDS).map((brand) => brand.home);

function notFoundPage(c) {
  return c.html(
    shell(c, {
      title: 'Sahifa topilmadi',
      active: '',
      scripts: ['dashboard'],
      body: emptyState({
        icon: 'search',
        title: 'Bunday sahifa yo‘q',
        text: 'Havola eskirgan yoki tovar o‘chirilgan bo‘lishi mumkin.',
        action: html`<a class="btn btn--primary" href="/admin">${ic('home')}<span>Bosh sahifaga</span></a>`,
      }),
    }),
    404,
  );
}

export function mountAdmin(app) {
  const page = requireAdmin();
  const api = requireAdmin({ api: true });
  const jsonLimit = bodyLimit({
    maxSize: 512 * 1024,
    onError: (c) => c.json({ ok: false, error: 'So‘rov juda katta.' }, 413),
  });

  // ---- Kirish / chiqish ------------------------------------------------------

  app.get('/admin/login', (c) => {
    const next = safeNext(c.req.query('next'));
    if (currentSession(c)) return c.redirect(next);
    c.header('Cache-Control', 'no-store');
    const configured = passwordConfigured();
    return c.html(loginPage({ next, configured, error: configured ? '' : NOT_CONFIGURED }));
  });

  app.post(
    '/admin/login',
    bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.html(loginPage({ error: 'So‘rov juda katta.' }), 413) }),
    async (c) => {
      c.header('Cache-Control', 'no-store');
      const ip = clientIp(c);
      let form = {};
      try {
        form = await c.req.parseBody();
      } catch {
        form = {};
      }
      const next = safeNext(form.next);
      if (!passwordConfigured()) return c.html(loginPage({ next, configured: false, error: NOT_CONFIGURED }), 503);
      if (!sameOrigin(c)) {
        return c.html(loginPage({ next, error: 'So‘rov rad etildi. Sahifani yangilab, qayta urinib ko‘ring.' }), 403);
      }
      const wait = loginBlockedFor(ip);
      if (wait > 0) return c.html(loginPage({ next, blocked: true, error: tooMany(wait) }), 429);

      const password = typeof form.password === 'string' ? form.password : '';
      if (!verifyPassword(password)) {
        noteLoginFailure(ip);
        await sleep(400); // parolni tez-tez sinab ko'rishni sekinlashtiradi
        const left = loginBlockedFor(ip);
        return c.html(
          loginPage({ next, blocked: left > 0, error: left > 0 ? tooMany(left) : 'Parol noto‘g‘ri. Qayta urinib ko‘ring.' }),
          left > 0 ? 429 : 401,
        );
      }
      clearLoginFailures(ip);
      startSession(c);
      return c.redirect(next, 303);
    },
  );

  app.post('/admin/logout', api, (c) => {
    endSession(c);
    return c.json({ ok: true });
  });

  // ---- Sahifalar -------------------------------------------------------------

  app.get('/admin', page, (c) => c.html(dashboardPage(c)));
  app.get('/admin/products', page, (c) => c.html(productsPage(c)));
  app.get('/admin/products/new', page, (c) => {
    const category = Number(c.req.query('category'));
    return c.html(productEditPage(c, null, { brand: c.req.query('brand'), category: Number.isInteger(category) && category > 0 ? category : null }));
  });
  app.get('/admin/products/:id', page, (c) => {
    const id = idOf(c);
    const product = id ? getProduct(id) : null;
    return product ? c.html(productEditPage(c, product)) : notFoundPage(c);
  });
  app.get('/admin/categories', page, (c) => c.html(categoriesPage(c)));
  app.get('/admin/slides', page, (c) => c.html(slidesPage(c)));
  app.get('/admin/settings', page, (c) => c.html(settingsPage(c)));

  // ---- Rasm yuklash ------------------------------------------------------------

  app.post(
    '/admin/api/images',
    api,
    bodyLimit({
      maxSize: IMAGE_LIMITS.requestBytes,
      onError: (c) => c.json({ ok: false, error: 'Fayl juda katta. Bitta rasm 8 MB dan oshmasligi kerak.' }, 413),
    }),
    async (c) => {
      let form;
      try {
        form = await c.req.formData();
      } catch {
        return bad(c, 'Faylni o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
      }
      const full = form.get('full');
      const thumb = form.get('thumb');
      const color = form.get('color');
      if (!(full instanceof File) || !full.size) return bad(c, 'Fayl yuborilmadi.');

      let meta;
      try {
        meta = storeImage({
          full: Buffer.from(await full.arrayBuffer()),
          thumb: thumb instanceof File && thumb.size ? Buffer.from(await thumb.arrayBuffer()) : null,
          color: typeof color === 'string' ? color : '',
        });
      } catch (err) {
        if (err instanceof ImageError) return bad(c, err.message);
        throw err;
      }
      try {
        return c.json({ ok: true, image: insertImage(meta) }, 201);
      } catch (err) {
        removeImageFiles(meta);
        throw err;
      }
    },
  );

  // ---- Tovarlar ----------------------------------------------------------------

  // Tugma qayerga olib borishini saqlamasdan oldin ko'rsatish (muharrirdagi jonli qator)
  app.post('/admin/api/resolve', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input) return bad(c);
    const { data, errors } = cleanProduct({ ...input, name: input.name || 'Tovar', image_ids: [] });
    const settings = getSettings();
    const labels = dictionary().dest;
    const product = {
      brand: data.brand || 'lootbox',
      name: data.name,
      dest_type: data.dest_type,
      uzum_url: data.uzum_url,
      channel_url: data.channel_url,
      dm_username: data.dm_username,
    };
    const dest = resolveDestination(product, settings);
    const others = dest && settings.show_other_links !== '0' ? otherDestinations(product, settings, dest.type) : [];
    const linkErrors = {};
    for (const key of ['uzum_url', 'channel_url', 'dm_username']) if (errors[key]) linkErrors[key] = errors[key];
    return c.json({
      ok: true,
      wanted: product.dest_type === 'default' ? settings.default_dest : product.dest_type,
      usesDefault: product.dest_type === 'default',
      primary: dest ? { type: dest.type, url: dest.url, label: labels[dest.type].cta, fallback: dest.fallback } : null,
      others: others.map((item) => ({ type: item.type, url: item.url, label: labels[OTHER_LABEL[item.type]] })),
      errors: linkErrors,
    });
  });

  app.post('/admin/api/products/reorder', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input || !BRANDS.includes(input.brand) || !Array.isArray(input.ids) || input.ids.length > 5000) return bad(c);
    return c.json({ ok: true, order: reorderWithin('products', input.brand, input.ids) });
  });

  app.post('/admin/api/products', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanProduct(input);
    if (!result.ok) return invalid(c, result.errors);
    const id = createProduct(result.data, result.imageIds);
    const created = getProduct(id);
    queueUrls(productPaths(created));
    return c.json({ ok: true, product: productSummary(created) }, 201);
  });

  app.put('/admin/api/products/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    if (!id || !getProduct(id)) return missing(c);
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanProduct(input);
    if (!result.ok) return invalid(c, result.errors);
    const before = getProduct(id);
    if (!updateProduct(id, result.data, Array.isArray(input.image_ids) ? result.imageIds : undefined)) return missing(c);
    const product = getProduct(id);
    // Havola nomi yoki kategoriyasi o'zgargan bo'lsa, eski manzillar ham xabar qilinadi
    queueUrls(productPaths(before), productPaths(product));
    return c.json({ ok: true, product: productSummary(product), images: product.images, seo: productSeoSummary(product) });
  });

  app.patch('/admin/api/products/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    const input = await readJson(c);
    if (!id || !input || typeof input.field !== 'string') return bad(c);
    if (!patchProduct(id, input.field, Boolean(input.value))) return missing(c);
    const patched = getProduct(id);
    queueUrls(productPaths(patched));
    return c.json({ ok: true, product: productSummary(patched) });
  });

  app.delete('/admin/api/products/:id', api, (c) => {
    const id = idOf(c);
    const doomed = id ? getProduct(id) : null;
    if (!id || !deleteProduct(id)) return missing(c);
    queueUrls(productPaths(doomed));
    return c.json({ ok: true });
  });

  app.post('/admin/api/products/:id/duplicate', api, (c) => {
    const id = idOf(c);
    const copy = id ? duplicateProduct(id) : null;
    return copy ? c.json({ ok: true, id: copy }, 201) : missing(c);
  });

  // ---- Kategoriyalar -------------------------------------------------------------

  app.post('/admin/api/categories/reorder', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input || !BRANDS.includes(input.brand) || !Array.isArray(input.ids) || input.ids.length > 1000) return bad(c);
    return c.json({ ok: true, order: reorderWithin('categories', input.brand, input.ids) });
  });

  app.post('/admin/api/categories', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanCategory(input);
    if (!result.ok) return invalid(c, result.errors);
    const id = createCategory(result.data);
    const created = getCategory(id);
    queueUrls(categoryPaths(created));
    return c.json({ ok: true, category: created }, 201);
  });

  app.put('/admin/api/categories/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    if (!id || !getCategory(id)) return missing(c);
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanCategory(input);
    if (!result.ok) return invalid(c, result.errors);
    const before = getCategory(id);
    if (!updateCategory(id, result.data)) return missing(c);
    const category = getCategory(id);
    queueUrls(categoryPaths(before), categoryPaths(category));
    return c.json({ ok: true, category });
  });

  app.patch('/admin/api/categories/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    const input = await readJson(c);
    if (!id || !input || typeof input.field !== 'string') return bad(c);
    if (!patchCategory(id, input.field, Boolean(input.value))) return missing(c);
    queueUrls(categoryPaths(getCategory(id)));
    return c.json({ ok: true });
  });

  app.delete('/admin/api/categories/:id', api, (c) => {
    const id = idOf(c);
    const doomed = id ? getCategory(id) : null;
    if (!id || !deleteCategory(id)) return missing(c);
    queueUrls(categoryPaths(doomed));
    return c.json({ ok: true });
  });

  // ---- Hero slaydlar -------------------------------------------------------------

  app.post('/admin/api/slides/reorder', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input || !BRANDS.includes(input.brand) || !Array.isArray(input.ids) || input.ids.length > 1000) return bad(c);
    return c.json({ ok: true, order: reorderWithin('slides', input.brand, input.ids) });
  });

  app.post('/admin/api/slides', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanSlide(input);
    if (!result.ok) return invalid(c, result.errors);
    const id = createSlide(result.data);
    return c.json({ ok: true, slide: getSlide(id) }, 201);
  });

  app.put('/admin/api/slides/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    if (!id || !getSlide(id)) return missing(c);
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanSlide(input);
    if (!result.ok) return invalid(c, result.errors);
    if (!updateSlide(id, result.data)) return missing(c);
    return c.json({ ok: true, slide: getSlide(id) });
  });

  app.patch('/admin/api/slides/:id', api, jsonLimit, async (c) => {
    const id = idOf(c);
    const input = await readJson(c);
    if (!id || !input || typeof input.field !== 'string') return bad(c);
    return patchSlide(id, input.field, Boolean(input.value)) ? c.json({ ok: true }) : missing(c);
  });

  app.delete('/admin/api/slides/:id', api, (c) => {
    const id = idOf(c);
    return id && deleteSlide(id) ? c.json({ ok: true }) : missing(c);
  });

  // ---- Sozlamalar, demo, sessiyalar -------------------------------------------------

  app.put('/admin/api/settings', api, jsonLimit, async (c) => {
    const input = await readJson(c);
    if (!input) return bad(c);
    const result = cleanSettings(input);
    if (!result.ok) return invalid(c, result.errors);
    saveSettings(result.patch);
    queueUrls(homePaths());
    return c.json({ ok: true, settings: getSettings() });
  });

  app.post('/admin/api/demo/clear', api, (c) => c.json({ ok: true, removed: clearDemo() }));

  app.post('/admin/api/sessions/end-all', api, (c) => {
    endAllSessions();
    endSession(c);
    return c.json({ ok: true });
  });

  // ---- Qolgan hamma narsa ------------------------------------------------------------

  app.all('/admin/api/*', api, (c) => missing(c, 'Bunday amal yo‘q.'));
  app.get('/admin/*', page, (c) => notFoundPage(c));
}
