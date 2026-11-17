// Tez tekshiruv:  npm run check
// Alohida vaqtinchalik bazada ishlaydi — haqiqiy data/ papkasiga tegmaydi.
// Sayt sahifalari, havolalar, rasm tekshiruvi va admin himoyasini sinaydi.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-check-'));
process.env.DATA_DIR = tmp;
process.env.ADMIN_PASSWORD = `check-${crypto.randomBytes(9).toString('hex')}`;
process.env.SITE_URL = '';
process.env.TRUST_PROXY = '';

const { closeDb, get, db } = await import('../server/db/index.js');
const { seedIfEmpty } = await import('../server/db/seed.js');
const repo = await import('../server/db/repo.js');
const { createApp } = await import('../server/app.js');
const text = await import('../server/lib/text.js');
const links = await import('../server/lib/links.js');
const images = await import('../server/lib/images.js');
const { html, jsonScript } = await import('../server/lib/html.js');

let passed = 0;
const failures = [];
function ok(condition, label, detail = '') {
  if (condition) passed += 1;
  else failures.push(detail ? `${label} — ${detail}` : label);
}
const eq = (actual, expected, label) =>
  ok(actual === expected, label, `kutilgan: ${JSON.stringify(expected)}, chiqdi: ${JSON.stringify(actual)}`);

seedIfEmpty();
const app = createApp();
const ORIGIN = 'http://localhost:3210';
const request = (url, init = {}) => app.fetch(new Request(ORIGIN + url, init));

// ---- Boshlang'ich ma'lumot: haqiqiy katalog (LOOTBOX) va namuna (FIT) -------------
const catalog = await import('../server/db/catalog.js');
const { CATALOG_PRODUCTS, CATALOG_SLIDES } = await import('../server/db/catalog-data.js');
const seeded = repo.listProducts({ brand: 'lootbox' });
eq(seeded.length, CATALOG_PRODUCTS.length, 'katalog: LOOTBOX tovarlari yozilgan');
ok(
  seeded.every((item) => !item.is_demo && /^https:\/\/uzum\.uz\/uz\/product\/[a-z0-9-]+\?skuId=\d+$/.test(item.uzum_url)),
  'katalog: haqiqiy tovarlar demo emas, har birida Uzum’dagi variant havolasi bor',
);
eq(new Set(CATALOG_PRODUCTS.map((item) => item.uzum_url)).size, CATALOG_PRODUCTS.length, 'katalog: Uzum havolalari takrorlanmaydi');
eq(seeded[0].uzum_url, CATALOG_PRODUCTS[0].uzum_url, 'katalog: saytdagi tartib fayldagi tartibga mos');
eq(repo.listSlides({ brand: 'lootbox' }).length, CATALOG_SLIDES.length, 'katalog: LOOTBOX slaydlari yozilgan');
eq(repo.demoCounts().products, repo.listProducts({ brand: 'fit' }).length, 'katalog: faqat FIT namunasi demo deb belgilangan');
const seededAgain = catalog.seedCatalog();
eq(seededAgain.products + seededAgain.categories + seededAgain.slides, 0, 'katalog: qayta yozilganda takror tovar qo‘shilmaydi');
// Tovar rasmlari loyihaning o'zida: har bir nom uchun to'liq rasm va kichik nusxa bor, ikkalasi ham fonsiz
const mediaNames = CATALOG_PRODUCTS.flatMap((item) => item.media);
ok(
  mediaNames.length >= CATALOG_PRODUCTS.length && mediaNames.every((name) => ['.webp', '.t.webp'].every((ext) => {
    const info = fs.existsSync(path.join(catalog.MEDIA_DIR, name + ext)) && images.sniffImage(fs.readFileSync(path.join(catalog.MEDIA_DIR, name + ext)));
    return info && info.alpha;
  })),
  'katalog: har bir tovar uchun fonsiz rasm va kichik nusxasi loyihada bor',
);
// Rasmlarni qayta yasash ta'riflari (npm run cutouts) katalogdagi rasm nomlari bilan bir xil bo'lishi kerak: bittasi
// unutilsa, o'sha rasm qayta yasalmaydi yoki ta'rif "yetim" bo'lib qoladi
const { SPECS } = await import('./cutouts/specs.js');
eq(Object.keys(SPECS).sort().join(','), [...new Set(mediaNames)].sort().join(','), 'kesim: har bir katalog rasmi uchun ta’rif bor, ortiqchasi yo‘q');
ok(
  Object.values(SPECS).every((spec) =>
    typeof spec.source === 'string'
      ? /^[a-z0-9]{16,32}$/.test(spec.source)
      : /^https:\/\//.test(spec.source?.url || '') && /^https:\/\//.test(spec.source?.page || ''),
  ),
  'kesim: har bir ta’rifda manba ko‘rsatilgan (Uzum identifikatori yoki rasm va sahifa manzili)',
);
// Do'kon egasi rad etganlari qaytib kelmasin: internetdagi suratlarda grip stiker sichqonchani to'liq o'ramagan,
// plakatdan kesilgan gilamcha esa xira edi
ok(
  ['grip-oq', 'grip-qora'].every((name) => typeof SPECS[name]?.source === 'string' && SPECS[name].outline?.length > 20),
  'kesim: oq va qora grip stiker o‘z plakatimizdan olinadi (sichqoncha to‘liq o‘ralgan ko‘rinish)',
);
ok(
  ['arcane-qizil', 'arcane-qora'].every((name) => {
    const spec = SPECS[name] || {};
    return spec.render === 'pad' && spec.view?.length === 4 && spec.size?.length === 3 && spec.color?.length === 3 && spec.logo?.points?.length >= 4;
  }),
  'kesim: gilamcha plakatdan kesilmaydi, qayta chiziladi (ko‘rinish, o‘lcham, rang va logotip nuqtalari berilgan)',
);
ok(seeded.every((item) => item.images.length >= 1 && item.images.every((image) => image.cutout)), 'katalog: birinchi ishga tushirishda tovarlarga fonsiz rasmlar biriktiriladi');
const mediaAgain = catalog.importCatalogMedia();
ok(mediaAgain.images === 0 && mediaAgain.skipped === CATALOG_PRODUCTS.length, 'katalog: rasmi bor tovarga qayta biriktirilmaydi');
eq(catalog.catalogPhotoStatus().withoutPhotos, 0, 'katalog: rasmsiz tovar qolmadi');
// Shu paytdagi fayllar soni — keyingi tekshiruvlar "ortiqcha fayl qolmadi" ni shunga solishtiradi
const uploadsDir = path.join(tmp, 'uploads');
const baseFiles = fs.readdirSync(uploadsDir).length;
eq(baseFiles, mediaNames.length * 2, 'katalog: har bir rasm kichik nusxasi bilan saqlangan');

// ---- Matn va havolalar -------------------------------------------------------
eq(text.slugify('Oversize futbolka — Basic (qora)'), 'oversize-futbolka-basic-qora', 'slug: oddiy nom');
eq(text.slugify('Magnitli qo‘l isitgich'), 'magnitli-qol-isitgich', 'slug: o‘ belgisi');
eq(text.slugify('Коврик для мыши'), 'kovrik-dlya-mishi', 'slug: kirill');
eq(text.slugify('***'), 'tovar', 'slug: bo‘sh natija');
eq(text.formatNumber(129000), `129${text.NBSP}000`, 'narx formati');
eq(text.formatNumber(999), '999', 'narx formati: kichik son');
eq(text.discountPercent(59000, 99000), 40, 'chegirma foizi');
eq(text.parseFeatures('Material: PTFE\n- Oddiy qator\n\nhttps://a.uz').length, 3, 'xususiyatlar soni');
eq(text.parseFeatures('Material: PTFE')[0].key, 'Material', 'xususiyat kaliti');
eq(text.parseFeatures('https://a.uz')[0].key, '', 'havola kalit emas');

eq(links.parseTelegram('@lootbox_uz')?.url, 'https://t.me/lootbox_uz', 'telegram: @username');
eq(links.parseTelegram('t.me/lootbox_uz/15')?.url, 'https://t.me/lootbox_uz/15', 'telegram: post havolasi');
eq(links.parseTelegram('https://t.me/+AbCdEf123')?.kind, 'link', 'telegram: taklif havolasi');
eq(links.parseTelegram('https://evil.example/lootbox'), null, 'telegram: begona sayt rad etiladi');
eq(links.parseTelegram('javascript:alert(1)'), null, 'telegram: javascript rad etiladi');
eq(links.parseHttpUrl('uzum.uz/uz/shop/lootbox'), 'https://uzum.uz/uz/shop/lootbox', 'havola: https qo‘shiladi');
eq(links.parseHttpUrl('javascript:alert(1)'), null, 'havola: javascript rad etiladi');
eq(links.parseHttpUrl('data:text/html,x'), null, 'havola: data rad etiladi');
eq(links.isUzumUrl('https://uzum.uz/uz/product/x-1'), true, 'uzum havolasi taniladi');
eq(links.isUzumUrl('https://uzum.uz.evil.com/x'), false, 'soxta uzum havolasi tanilmaydi');

const settings = { ...repo.SETTING_DEFAULTS, uzum_shop_lootbox: 'https://uzum.uz/uz/shop/lootbox', tg_channel: '@kanal_test', tg_dm: 'sotuvchi_test' };
const sample = { brand: 'lootbox', name: 'Glayd', dest_type: 'default', uzum_url: 'https://uzum.uz/uz/product/a-1', channel_url: '', dm_username: '' };
eq(links.resolveDestination(sample, settings)?.url, 'https://uzum.uz/uz/product/a-1', 'yo‘nalish: standart → Uzum tovar havolasi');
eq(links.resolveDestination({ ...sample, uzum_url: '' }, settings)?.url, 'https://uzum.uz/uz/shop/lootbox', 'yo‘nalish: tovar havolasi yo‘q → do‘kon');
eq(links.resolveDestination({ ...sample, dest_type: 'channel' }, settings)?.url, 'https://t.me/kanal_test', 'yo‘nalish: kanal');
ok(links.resolveDestination({ ...sample, dest_type: 'dm' }, settings)?.url.startsWith('https://t.me/sotuvchi_test?text='), 'yo‘nalish: lichka (tayyor matn bilan)');
eq(links.resolveDestination({ ...sample, dest_type: 'dm' }, { ...settings, tg_dm: '' })?.type, 'uzum', 'yo‘nalish: lichka sozlanmagan → Uzum');
eq(links.resolveDestination({ ...sample, uzum_url: '' }, repo.SETTING_DEFAULTS), null, 'yo‘nalish: hech narsa sozlanmagan → tugma yo‘q');

eq(String(html`<p>${'<script>"x"</script>'}</p>`), '<p>&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p>', 'HTML ekranlanadi');
ok(!String(jsonScript({ a: '</script><b>' })).includes('</script>'), 'JSON ichida </script> bo‘lmaydi');

// ---- Rasm tekshiruvi ----------------------------------------------------------
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAEklEQVR4nGP8z8Dwn4EIwESMIgBoHgIDcCLE8QAAAABJRU5ErkJggg==', 'base64');
const png = images.sniffImage(PNG);
ok(png && png.mime === 'image/png' && png.width === 2 && png.height === 3, 'PNG taniladi va o‘lchami o‘qiladi');
eq(images.sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null, 'SVG rasm deb qabul qilinmaydi');
eq(images.sniffImage(Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(40)])), null, 'GIF qabul qilinmaydi');
eq(images.sniffImage(Buffer.from('MZ' + 'x'.repeat(60))), null, 'dastur fayli rasm emas');
const hugePng = Buffer.from(PNG);
hugePng.writeUInt32BE(20000, 16);
eq(images.sniffImage(hugePng), null, 'juda katta o‘lchamli rasm rad etiladi');
// Shaffoflik (fonsiz rasm) baytlardan aniqlanadi: RGBA PNG — bor, oddiy (VP8) WebP — yo'q
eq(png.alpha, true, 'rasm: shaffof kanalli PNG fonsiz deb taniladi');
const OPAQUE = Buffer.alloc(48);
OPAQUE.write('RIFF', 0, 'latin1');
OPAQUE.writeUInt32LE(40, 4);
OPAQUE.write('WEBPVP8 ', 8, 'latin1');
OPAQUE[23] = 0x9d;
OPAQUE[24] = 0x01;
OPAQUE[25] = 0x2a;
OPAQUE.writeUInt16LE(300, 26);
OPAQUE.writeUInt16LE(400, 28);
const opaque = images.sniffImage(OPAQUE);
ok(opaque && opaque.alpha === false && opaque.width === 300 && opaque.height === 400, 'rasm: shaffofligi yo‘q WebP oddiy surat deb taniladi');
eq(images.isMediaName('../../.env'), false, 'media nomi: yuqoriga chiqish rad etiladi');
eq(images.isMediaName('0123456789abcdef0123.t.webp'), true, 'media nomi: to‘g‘ri nom');
let thrown = '';
try {
  images.storeImage({ full: Buffer.from('bu rasm emas, shunchaki matn '.repeat(4)) });
} catch (err) {
  thrown = err instanceof images.ImageError ? 'ImageError' : String(err);
}
eq(thrown, 'ImageError', 'rasm bo‘lmagan fayl saqlanmaydi');

// ---- Sayt sahifalari ----------------------------------------------------------
const product = repo.listProducts({ brand: 'lootbox', visibleOnly: true })[0];
const fitProduct = repo.listProducts({ brand: 'fit', visibleOnly: true })[0];
ok(product && fitProduct, 'demo tovarlar yozilgan');

for (const url of ['/', '/fit', '/katalog', '/fit/katalog', '/katalog/glaydlar', '/fit/katalog/futbolkalar', `/tovar/${product.slug}`, `/tovar/${fitProduct.slug}`, '/sitemap.xml', '/robots.txt', '/favicon.svg', '/static/site/css/site.css', '/static/site/js/app.js', '/static/shared/art.css', '/static/vendor/fonts/unbounded-latin-wght-normal.woff2']) {
  const res = await request(url);
  eq(res.status, 200, `GET ${url}`);
  await res.arrayBuffer();
}

const home = await (await request('/')).text();
ok(home.includes('data-brand="lootbox"'), 'bosh sahifa: LOOTBOX brendi');
ok(home.includes(product.slug), 'bosh sahifa: tovar havolasi bor');
ok(home.includes('href="/fit"'), 'bosh sahifa: FIT ga o‘tish bor');
ok(home.includes('https://uzum.uz/uz/shop/lootbox'), 'bosh sahifa: Uzum do‘kon havolasi');
ok(!home.includes('undefined') && !home.includes('[object Object]'), 'bosh sahifa: "undefined" yo‘q');
ok(home.includes('deck deck--cutout') && !home.includes('hero__glyph'), 'hero: fonsiz tovar rasmlari 3D sahnada, chizma belgi yo‘q');

const fit = await (await request('/fit')).text();
ok(fit.includes('data-brand="fit"') && fit.includes(fitProduct.slug), 'FIT sahifasi: o‘z tovarlari');
ok(!fit.includes(`/tovar/${product.slug}"`) || fit.includes('class="band'), 'FIT sahifasi: LOOTBOX tovarlari faqat taklif blokida');

const productHtml = await (await request(`/tovar/${product.slug}`)).text();
ok(productHtml.includes(`href="${product.uzum_url}"`), 'tovar sahifasi: tugma Uzum havolasiga olib boradi');
ok(productHtml.includes('rel="noopener"'), 'tovar sahifasi: tashqi havola xavfsiz ochiladi');
ok(productHtml.includes('application/ld+json'), 'tovar sahifasi: qidiruv uchun ma’lumot');
ok(!productHtml.includes('undefined') && !productHtml.includes('[object Object]'), 'tovar sahifasi: "undefined" yo‘q');

for (const url of ['/tovar/bunday-tovar-yoq', '/katalog/bunday-kategoriya-yoq', '/yoq-sahifa', '/static/../.env', '/static/%2e%2e/.env', '/static/site/css/../../../.env', '/media/..%2F..%2F.env', '/media/passwd', '/static/nofile.css']) {
  const res = await request(url);
  eq(res.status, 404, `404: ${url}`);
  const body = await res.text();
  ok(!body.includes('ADMIN_PASSWORD'), `maxfiy fayl chiqmaydi: ${url}`);
}

const redirect = await request('/katalog/');
ok(redirect.status === 301 || redirect.status === 302, 'oxiridagi "/" olib tashlanadi', `status ${redirect.status}`);

const headers = (await request('/')).headers;
ok((headers.get('content-security-policy') || '').includes("script-src 'self'"), 'xavfsizlik sarlavhasi: CSP');
eq(headers.get('x-frame-options'), 'DENY', 'xavfsizlik sarlavhasi: X-Frame-Options');
eq(headers.get('x-content-type-options'), 'nosniff', 'xavfsizlik sarlavhasi: nosniff');

// ---- Qidiruv tizimlari (SEO) -------------------------------------------------------
// Har bir sahifaning o'z sarlavhasi, tavsifi va bitta asosiy sarlavhasi (h1) bo'lishi, odamlar qidiradigan so'zlar
// (skeyt, kovrik, ruscha nomlar) sahifada turishi va qidiruv tizimi tushunadigan ma'lumot to'g'ri chiqishi kerak.
const seoLib = await import('../server/site/seo.js');
const { siteEntries } = await import('../server/site/sitemap.js');
const validate = await import('../server/admin/validate.js');
const { dictionary } = await import('../server/i18n/index.js');
const unescapeHtml = (value) =>
  value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function headOf(pageHtml) {
  const pick = (pattern) => unescapeHtml((pageHtml.match(pattern) || [])[1] || '');
  let ld = null;
  try {
    ld = JSON.parse((pageHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || 'null');
  } catch {
    ld = 'buzuq';
  }
  return {
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    keywords: pick(/<meta name="keywords" content="([^"]*)"/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    robots: pick(/<meta name="robots" content="([^"]*)"/),
    h1: (pageHtml.match(/<h1[\s>]/g) || []).length,
    ld,
  };
}
const ldNode = (head, type) => (head.ld?.['@graph'] || []).find((node) => node['@type'] === type);
const headAt = async (url) => headOf(await (await request(url)).text());

const entries = siteEntries();
const heads = new Map();
for (const entry of entries) {
  const res = await request(entry.path);
  heads.set(entry.path, { status: res.status, ...headOf(await res.text()) });
}
ok(entries.length >= CATALOG_PRODUCTS.length + 6, 'seo: sayt xaritasida hamma tovar, kategoriya va bosh sahifalar bor', `${entries.length} ta`);
const flawed = [...heads].filter(
  ([, head]) =>
    head.status !== 200 || head.h1 !== 1 || !head.title || head.description.length < 50 || head.description.length > 300 || head.robots || !head.ld || head.ld === 'buzuq',
);
eq(flawed.map(([url]) => url).join(', '), '', 'seo: har bir sahifada sarlavha, tavsif, bitta h1 va tuzilgan ma’lumot bor');
ok([...heads].every(([url, head]) => head.canonical === ORIGIN + url), 'seo: canonical — sahifaning o‘z manzili');
eq(new Set([...heads.values()].map((head) => head.title)).size, heads.size, 'seo: sahifa sarlavhalari takrorlanmaydi');
const productHeads = [...heads].filter(([url]) => url.startsWith('/tovar/')).map(([, head]) => head);
eq(new Set(productHeads.map((head) => head.description)).size, productHeads.length, 'seo: tovar tavsiflari takrorlanmaydi (bir e’lonning variantlarida ham)');
eq(new Set([...heads.values()].map((head) => head.description)).size, heads.size, 'seo: sahifa tavsiflari takrorlanmaydi (bosh sahifa va katalogniki ham har xil)');

// Odamlar qidiradigan so'zlar avtomatik qo'yiladi (tovar turi kategoriya nomidan taniladi) va sahifada ko'rinadi
const pad = repo.listProducts({ brand: 'lootbox', visibleOnly: true }).find((item) => item.category?.slug === 'gilamchalar');
const padHtml = await (await request(`/tovar/${pad.slug}`)).text();
const padHead = headOf(padHtml);
ok(/kovrik/i.test(padHead.title) && padHead.title.includes(pad.name), 'seo: tovar sarlavhasida nomi va odamlar ishlatadigan so‘z (kovrik) bor', padHead.title);
ok(padHead.description.startsWith(pad.name) && padHead.description.includes('коврик'), 'seo: tovar tavsifi nomi bilan boshlanadi va ruscha nomni ham o‘z ichiga oladi', padHead.description);
ok(
  padHtml.includes('class="also product__also"') && padHtml.includes('<span lang="ru">коврик для мыши</span>'),
  'seo: tovar sahifasida «Boshqa nomlari» qatori bor, ruscha nomning tili belgilangan',
);
ok(padHtml.includes(`alt="${pad.name} — kovrik`), 'seo: rasm izohida tovar nomi va odamlar ishlatadigan nomi bor');
const padTerms = seoLib.searchTerms({ t: dictionary() }, { category: pad.category, product: pad });
ok(
  padTerms.visible.length > 0 && padTerms.visible.length <= seoLib.MAX_VISIBLE_TERMS && padTerms.keywords.length <= 12,
  'seo: qidiruv so‘zlari soni cheklangan (so‘z yig‘indisi emas)',
);
const padLd = ldNode(padHead, 'Product');
ok(
  padLd && padLd.offers?.price === pad.price && padLd.offers?.priceCurrency === 'UZS' && Array.isArray(padLd.alternateName) && padLd.image?.length === pad.images.length,
  'seo: tovar ma’lumoti (schema.org) — narx, valyuta, boshqa nomlar, rasmlar',
);
const padTrail = ldNode(padHead, 'BreadcrumbList')?.itemListElement || [];
ok(
  padTrail.length === 4 && padTrail[2].item === `${ORIGIN}/katalog/gilamchalar` && padTrail[3].item === `${ORIGIN}/tovar/${pad.slug}`,
  'seo: tovarning saytdagi yo‘li (bosh sahifa → katalog → kategoriya → tovar)',
);

const glidesHtml = await (await request('/katalog/glaydlar')).text();
const glidesHead = headOf(glidesHtml);
ok(glidesHead.title.includes('Sichqoncha glaydlari') && glidesHead.title.includes('skeytlar'), 'seo: kategoriya sarlavhasida nomi va «skeytlar» bor', glidesHead.title);
ok(
  glidesHtml.includes('class="pagehead__intro"') && glidesHtml.includes('class="also pagehead__also"') && glidesHead.keywords.includes('скейты для мыши'),
  'seo: kategoriya sahifasida kirish matni, «Boshqa nomlari» va ruscha qidiruv so‘zlari bor',
);
eq(
  ldNode(glidesHead, 'ItemList')?.numberOfItems,
  repo.listProducts({ brand: 'lootbox', visibleOnly: true }).filter((item) => item.category?.slug === 'glaydlar').length,
  'seo: kategoriya sahifasida tovarlar ro‘yxati (ItemList)',
);

const homeHead = headOf(home);
ok(homeHead.title.includes('skeytlar') && homeHead.description.includes('Скейты'), 'seo: bosh sahifa sarlavhasi va tavsifida odamlar qidiradigan so‘zlar bor', homeHead.title);
ok(
  ldNode(homeHead, 'Organization')?.name === 'LOOTBOX' && ldNode(homeHead, 'WebSite')?.url === `${ORIGIN}/`,
  'seo: bosh sahifada do‘kon va sayt haqida ma’lumot (schema.org)',
);
ok(
  /<h1><span>LOOTBOX<\/span>/.test(home) && !home.includes('<h1 class="hero__title'),
  'seo: bosh sahifaning asosiy sarlavhasi — «Brend haqida»dagi birinchi gap, slayd shiori emas',
);
ok(home.includes('class="index__aka"'), 'seo: kategoriyalar ro‘yxatida odamlar ishlatadigan nomlar ko‘rinadi');
// «Brend haqida» matni bo'lmasa, asosiy sarlavha — birinchi slayd
const aboutBefore = repo.getSettings().about_lootbox;
repo.saveSettings({ about_lootbox: '' });
const noAbout = await (await request('/')).text();
ok(noAbout.includes('<h1 class="hero__title') && headOf(noAbout).h1 === 1, 'seo: «Brend haqida» bo‘sh bo‘lsa, asosiy sarlavha birinchi slaydda');
repo.saveSettings({ about_lootbox: aboutBefore });

const robots = await (await request('/robots.txt')).text();
ok(
  robots.includes('Disallow: /admin') && robots.includes('Clean-param: sort /katalog') && robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`),
  'seo: robots.txt — admin yopiq, saralash alohida sahifa emas, sayt xaritasi ko‘rsatilgan',
);
ok((await (await request('/sitemap.xml')).text()).includes(`<loc>${ORIGIN}/tovar/${pad.slug}</loc><lastmod>`), 'seo: sayt xaritasida tovar va uning o‘zgargan sanasi bor');
eq((await headAt('/katalog?sort=price_asc')).canonical, `${ORIGIN}/katalog`, 'seo: saralangan katalogning canonical manzili — asosiy katalog');
ok((await headAt('/yoq-sahifa')).robots.includes('noindex'), 'seo: 404 sahifasi qidiruvga kirmaydi');
// Yashirilgan tovar va tovarsiz bo'lim qidiruv tizimiga berilmaydi
repo.patchProduct(pad.id, 'visible', 0);
ok(!siteEntries().some((entry) => entry.path === `/tovar/${pad.slug}`), 'seo: yashirilgan tovar sayt xaritasida yo‘q');
repo.patchProduct(pad.id, 'visible', 1);
const fitItems = repo.listProducts({ brand: 'fit' });
for (const item of fitItems) repo.patchProduct(item.id, 'visible', 0);
ok(
  (await headAt('/fit')).robots.includes('noindex') && (await headAt('/fit/katalog')).robots.includes('noindex') && !siteEntries().some((entry) => entry.path.startsWith('/fit')),
  'seo: tovarsiz bo‘lim («Tovarlar tez orada») qidiruvga kirmaydi va sayt xaritasida yo‘q',
);
ok(!(await headAt('/')).robots, 'seo: asosiy bosh sahifa har doim qidiruvga ochiq');
for (const item of fitItems) repo.patchProduct(item.id, 'visible', item.visible);

// Admin o'z matnini yozsa — avtomatik o'rniga o'sha ishlatiladi
const cleanedSeo = validate.cleanProduct({ brand: 'lootbox', name: 'Sinov', search_terms: 'kovrik, Kovrik; mousepad\nковрик', meta_title: '  O‘z sarlavham ', meta_description: 'O‘z tavsifim' });
ok(
  cleanedSeo.ok && cleanedSeo.data.search_terms === 'kovrik, mousepad, коврик' && cleanedSeo.data.meta_title === 'O‘z sarlavham',
  'seo admin: qidiruv so‘zlari tartibga keltiriladi (takrorlar olib tashlanadi)',
  cleanedSeo.data.search_terms,
);
ok(
  !validate.cleanProduct({ brand: 'lootbox', name: 'Sinov', search_terms: Array.from({ length: 13 }, (_, i) => `soz${i}`).join(',') }).ok,
  'seo admin: qidiruv so‘zlari soni cheklangan (13 tasi rad etiladi)',
);
ok(!validate.cleanProduct({ brand: 'lootbox', name: 'Sinov', meta_title: 'x'.repeat(121) }).ok, 'seo admin: juda uzun sarlavha rad etiladi');
const padRow = repo.getProduct(pad.id);
repo.updateProduct(pad.id, { ...padRow, search_terms: 'matras, to‘shama', meta_title: 'Maxsus sarlavha', meta_description: 'Maxsus tavsif matni.' });
const customHtml = await (await request(`/tovar/${pad.slug}`)).text();
const customHead = headOf(customHtml);
ok(
  customHead.title === 'Maxsus sarlavha' && customHead.description === 'Maxsus tavsif matni.' && customHead.keywords === 'matras, to‘shama' &&
    customHtml.includes('matras, to‘shama</p>') && !customHtml.includes('коврик для мыши'),
  'seo admin: tovarga yozilgan sarlavha, tavsif va qidiruv so‘zlari avtomatik o‘rniga ishlatiladi',
);
repo.updateProduct(pad.id, padRow);
const padCategory = repo.getCategoryBySlug('lootbox', 'gilamchalar');
repo.updateCategory(padCategory.id, { ...padCategory, search_terms: 'padlar, to‘shamalar', intro: 'O‘z kirish matnim.' });
const padCategoryHtml = await (await request('/katalog/gilamchalar')).text();
ok(
  (await (await request(`/tovar/${pad.slug}`)).text()).includes('padlar, to‘shamalar</p>') && padCategoryHtml.includes('O‘z kirish matnim.') &&
    headOf(padCategoryHtml).title.includes('(padlar, to‘shamalar)'),
  'seo admin: kategoriyaning qidiruv so‘zlari tovarlariga ham o‘tadi, kirish matni sahifada chiqadi',
);
repo.updateCategory(padCategory.id, padCategory);
eq((await headAt(`/tovar/${pad.slug}`)).title, padHead.title, 'seo admin: maydonlar bo‘shatilsa, avtomatik matn qaytadi');

// Saytni tasdiqlash kodlari (Google Search Console, Yandex Webmaster)
const verify = validate.cleanSettings({
  google_verification: '<meta name="google-site-verification" content="abcDEF123456_test-code" />',
  yandex_verification: '0123456789abcdef',
  indexnow: false,
});
ok(
  verify.ok && verify.patch.google_verification === 'abcDEF123456_test-code' && verify.patch.yandex_verification === '0123456789abcdef' && verify.patch.indexnow === '0',
  'seo admin: tasdiqlash tegi butunligicha qo‘yilsa ham ichidan kod olinadi',
);
ok(!validate.cleanSettings({ google_verification: 'bu kod emas <script>' }).ok, 'seo admin: noto‘g‘ri tasdiqlash kodi rad etiladi');
repo.saveSettings(verify.patch);
const verifiedHtml = await (await request(`/tovar/${pad.slug}`)).text();
ok(
  verifiedHtml.includes('<meta name="google-site-verification" content="abcDEF123456_test-code">') &&
    verifiedHtml.includes('<meta name="yandex-verification" content="0123456789abcdef">'),
  'seo: tasdiqlash teglari sahifalarda chiqadi',
);
repo.saveSettings({ google_verification: '', yandex_verification: '', indexnow: '1' });
ok(!(await (await request('/')).text()).includes('site-verification'), 'seo: kod kiritilmagan bo‘lsa tasdiqlash tegi chiqmaydi');

// IndexNow: kalit fayli saytda ochiq turadi; lokal ishlaganda qidiruv tizimlariga hech narsa yuborilmaydi
const indexnow = await import('../server/lib/indexnow.js');
const nowKey = indexnow.indexNowKey();
eq(await (await request(`/${nowKey}.txt`)).text(), nowKey, 'indexnow: kalit fayli saytda ochiladi');
eq((await request('/0123456789abcdef0123456789abcdef.txt')).status, 404, 'indexnow: boshqa nomdagi kalit fayli yo‘q');
eq(indexnow.indexNowKey(), nowKey, 'indexnow: kalit o‘zgarmaydi');
eq(indexnow.queueUrls('/katalog'), false, 'indexnow: lokal ishlaganda (SITE_URL yo‘q) hech narsa yuborilmaydi');

// Eski bazadagi boshlang'ich sarlavha yangisiga almashadi, egasi o'zgartirgan matnga esa tegilmaydi
const { MIGRATIONS } = await import('../server/db/schema.js');
const seoDefaults = { seo_title_lootbox: repo.getSettings().seo_title_lootbox, seo_desc_lootbox: repo.getSettings().seo_desc_lootbox };
repo.saveSettings({ seo_title_lootbox: 'LOOTBOX — texnika va gaming aksessuarlari', seo_desc_lootbox: 'Mening o‘z tavsifim' });
db.exec(MIGRATIONS.find((sql) => sql.includes("key = 'seo_title_lootbox'")));
eq(get("SELECT value FROM settings WHERE key = 'seo_title_lootbox'").value, seoDefaults.seo_title_lootbox, 'seo: eski boshlang‘ich sarlavha yangisiga almashadi');
eq(get("SELECT value FROM settings WHERE key = 'seo_desc_lootbox'").value, 'Mening o‘z tavsifim', 'seo: egasi o‘zgartirgan tavsifga tegilmaydi');
repo.saveSettings(seoDefaults);

// Yashirilgan tovar saytda ko'rinmaydi
repo.patchProduct(product.id, 'visible', 0);
eq((await request(`/tovar/${product.slug}`)).status, 404, 'yashirilgan tovar: sahifasi 404');
ok(!(await (await request('/katalog')).text()).includes(product.slug), 'yashirilgan tovar: katalogda yo‘q');
repo.patchProduct(product.id, 'visible', 1);

// Chekka holatlar: narxsiz, kategoriyasiz, juda uzun nomli, havolasiz tovar
const bareId = repo.createProduct({
  brand: 'lootbox', category_id: null, name: 'Juda uzun nomli tovar '.repeat(6).trim(), tagline: '', description: '', features: '',
  price: null, old_price: null, badge_new: 0, badge_hit: 0, featured: 0, visible: 1,
  dest_type: 'dm', uzum_url: '', channel_url: '', dm_username: '', art: '',
});
const bare = repo.getProduct(bareId);
const bareHtml = await (await request(`/tovar/${bare.slug}`)).text();
ok(bareHtml.includes('Juda uzun nomli tovar'), 'chekka holat: narxsiz va kategoriyasiz tovar sahifasi ochiladi');
ok(bareHtml.includes('https://uzum.uz/uz/shop/lootbox'), 'chekka holat: lichka sozlanmagan → tugma Uzum do‘koniga olib boradi');
ok(!bareHtml.includes('undefined') && !bareHtml.includes('NaN'), 'chekka holat: "undefined" / "NaN" yo‘q');

const savedSettings = { ...repo.getSettings() };
repo.saveSettings({ uzum_shop_lootbox: '', uzum_shop_fit: '', tg_channel: '', tg_dm: '' });
const noLinkHtml = await (await request(`/tovar/${bare.slug}`)).text();
ok(noLinkHtml.includes('Tez orada sotuvda'), 'chekka holat: hech qanday havola yo‘q → "Tez orada sotuvda"');
eq((await request('/')).status, 200, 'chekka holat: havolalar bo‘sh bo‘lsa ham bosh sahifa ochiladi');

repo.saveSettings({ tg_channel: '@kanal_test', tg_dm: '@sotuvchi_test', default_dest: 'channel' });
const channelHtml = await (await request(`/tovar/${product.slug}`)).text();
ok(channelHtml.includes('href="https://t.me/kanal_test"'), 'sozlama: standart yo‘nalish kanal → tugma kanalga olib boradi');
ok(channelHtml.includes('https://t.me/sotuvchi_test?text='), 'sozlama: qo‘shimcha "savol berish" tugmasi lichkaga olib boradi');
ok((await (await request('/')).text()).includes('class="cta"'), 'sozlama: kanal bor → bosh sahifada Telegram bloki chiqadi');
repo.saveSettings({ card_click: 'direct' });
ok((await (await request('/katalog')).text()).includes('class="card__link" href="https://t.me/kanal_test"'), 'sozlama: kartochka bosilganda to‘g‘ridan-to‘g‘ri havolaga');
repo.saveSettings({ show_prices: '0' });
ok(!(await (await request('/katalog')).text()).includes('class="price"'), 'sozlama: narxlar yashirilgan');
repo.saveSettings(savedSettings);
repo.deleteProduct(bareId);

// Rasmli tovar: rasm saqlanadi, saytda chiqadi, tovar o'chirilganda fayl ham o'chadi
const stored = repo.insertImage(images.storeImage({ full: PNG, thumb: PNG, color: '#AABBCC' }));
ok(stored && stored.url.startsWith('/media/') && stored.color === '#aabbcc', 'rasm: saqlandi va rangi yozildi');
const second = repo.insertImage(images.storeImage({ full: PNG }));
const photoId = repo.createProduct({
  brand: 'lootbox', category_id: product.category_id, name: 'Rasmli sinov tovar', tagline: '', description: 'Tavsif', features: '',
  price: 1000, old_price: 2000, badge_new: 1, badge_hit: 0, featured: 0, visible: 1,
  dest_type: 'uzum', uzum_url: 'https://uzum.uz/uz/product/sinov-1', channel_url: '', dm_username: '', art: '',
}, [stored.id, second.id]);
const photo = repo.getProduct(photoId);
eq(photo.images.length, 2, 'rasm: tovarga ikkita rasm biriktirildi');
eq(photo.images[0].id, stored.id, 'rasm: tartib saqlanadi (birinchisi — muqova)');
const mediaRes = await request(stored.url);
eq(mediaRes.status, 200, 'rasm: /media orqali ochiladi');
eq(mediaRes.headers.get('content-type'), 'image/png', 'rasm: turi to‘g‘ri uzatiladi');
ok((mediaRes.headers.get('cache-control') || '').includes('immutable'), 'rasm: uzoq keshlanadi');
await mediaRes.arrayBuffer();
const photoHtml = await (await request(`/tovar/${photo.slug}`)).text();
ok(photoHtml.includes(`data-zoom="${stored.url}"`) && photoHtml.includes('data-lightbox'), 'rasm: tovar sahifasida galereya va kattalashtirish bor');
ok(photoHtml.includes(`property="og:image" content="${ORIGIN}${stored.url}"`), 'rasm: Telegram uchun muqova (og:image)');
ok((await (await request('/katalog')).text()).includes(`src="${stored.thumb_url}"`), 'rasm: katalog kartochkasida chiqadi');
repo.updateProduct(photoId, { ...photo, slug: photo.slug }, [second.id]);
eq((await request(stored.url)).status, 404, 'rasm: tovardan olib tashlangan rasm fayli o‘chadi');
eq((await request(second.url)).status, 200, 'rasm: qolgan rasm joyida');
repo.deleteProduct(photoId);
eq((await request(second.url)).status, 404, 'rasm: tovar o‘chirilganda rasmi ham o‘chadi');
eq(fs.readdirSync(uploadsDir).length, baseFiles, 'rasm: uploads papkasida ortiqcha fayl qolmaydi');

// Hamma tovar yashirilsa — bo'sh holat (xato emas)
const everyone = repo.listProducts({ brand: 'fit' });
for (const item of everyone) repo.patchProduct(item.id, 'visible', 0);
const emptyFit = await request('/fit');
eq(emptyFit.status, 200, 'chekka holat: tovarsiz bo‘lim ochiladi');
ok((await emptyFit.text()).includes('Tovarlar tez orada'), 'chekka holat: tovarsiz bo‘limda tushuntirish chiqadi');
eq((await request('/fit/katalog')).status, 200, 'chekka holat: tovarsiz katalog ochiladi');
for (const item of everyone) repo.patchProduct(item.id, 'visible', 1);

// Bosh sahifa tafsilotlari
ok(/class="section spotlight"[^>]* data-product="\d+"/.test(home), 'bosh sahifa: tanlov blokidagi tugma bosilishi ham sanaladi');
const promo = repo.createSlide({
  brand: 'lootbox', kicker: 'Aksiya', title: '11.11 chegirma 2.0 keldi. Shoshiling!', subtitle: '', cta_label: '',
  link_type: 'url', link_value: `/${String.fromCharCode(92)}evil.example`, image_id: null, art: 'box', tone: '', visible: 1,
});
const promoHome = await (await request('/')).text();
ok(promoHome.includes('>11.11</span>') && promoHome.includes('>2.0</span>') && !promoHome.includes('>11.</span>'), 'slayd sarlavhasi: "11.11" va "2.0" o‘rtasidan bo‘linmaydi');
ok(!promoHome.includes('evil.example'), 'slayd havolasi: teskari chiziq bilan boshqa saytga chiqib bo‘lmaydi');
repo.deleteSlide(promo);

// Kategoriyasiz tovar ham "Hammasi" sonida hisoblanadi
const looseId = repo.createProduct({
  brand: 'fit', category_id: null, name: 'Kategoriyasiz sinov', tagline: '', description: '', features: '', price: 1000, old_price: null,
  badge_new: 0, badge_hit: 0, featured: 0, visible: 1, dest_type: 'default', uzum_url: '', channel_url: '', dm_username: '', art: '',
});
const fitTotal = repo.listProducts({ brand: 'fit', visibleOnly: true }).length;
ok((await (await request('/fit/katalog/futbolkalar')).text()).includes(`<i>${fitTotal}</i>`), 'katalog: "Hammasi" soni kategoriyasiz tovarni ham hisoblaydi');
repo.deleteProduct(looseId);

// Kichik katalog: bir xil tovarlar ikki karuselda takrorlanmaydi
const fitAll = repo.listProducts({ brand: 'fit' });
for (const item of fitAll.slice(2)) repo.patchProduct(item.id, 'visible', 0);
for (const item of fitAll.slice(0, 2)) for (const field of ['badge_new', 'badge_hit', 'featured']) repo.patchProduct(item.id, field, 0);
const smallFit = await (await request('/fit')).text();
eq(smallFit.split('data-carousel-track').length - 1, 1, 'kichik katalog: bitta karusel (takror yo‘q)');
for (const item of fitAll) {
  repo.patchProduct(item.id, 'visible', 1);
  for (const field of ['badge_new', 'badge_hit', 'featured']) repo.patchProduct(item.id, field, item[field]);
}

// Statistika
const track = (body, origin = ORIGIN) => request('/api/track', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Origin: origin } });
eq((await track({ id: product.id, kind: 'uzum' })).status, 204, 'statistika: bosish qabul qilinadi');
await track({ id: product.id, kind: 'view' });
await track({ id: 999999, kind: 'uzum' });
await track({ id: product.id, kind: 'DROP TABLE' });
await track({ id: product.id, kind: 'uzum' }, 'https://evil.example');
eq(get('SELECT COALESCE(SUM(count), 0) AS n FROM stats_daily').n, 2, 'statistika: faqat o‘z saytimizdan kelgan to‘g‘ri hodisalar sanaladi');

// ---- Tovar rasmlari saytda: fonsiz rasm (tovarning o'zi) va oddiy surat -------------------
const { slidePhotos } = await import('../server/site/slide-photos.js');
const withPhotos = repo.listProducts({ brand: 'lootbox', visibleOnly: true });
const lootSlides = repo.listSlides({ brand: 'lootbox', visibleOnly: true });
const photoHome = await (await request('/')).text();
// Har bir slayddagi sahna rasmlari, sahifadagi tartibda
const deckSources = [...photoHome.matchAll(/class="deck__face"><img[^>]*? src="([^"]+)"/g)].map((match) => match[1]);
const expectedDeck = lootSlides.flatMap((slide) => slidePhotos(slide, withPhotos).map((image) => image.thumb_url));
ok(expectedDeck.length >= lootSlides.length * 2 && deckSources.join() === expectedDeck.join(), 'hero: har bir slayd bog‘langan tovar yoki kategoriya rasmlarini ko‘rsatadi');
const linkedSlide = lootSlides.find((slide) => slide.link_type === 'product');
const linkedProduct = withPhotos.find((item) => String(item.id) === String(linkedSlide?.link_value));
const linkedDeck = linkedSlide ? slidePhotos(linkedSlide, withPhotos) : [];
ok(
  linkedProduct && linkedDeck[0]?.id === linkedProduct.images[0].id
    && linkedDeck.slice(linkedProduct.images.length).every((image) => withPhotos.some((item) => item.id !== linkedProduct.id && item.category_id === linkedProduct.category_id && item.images[0].id === image.id)),
  'hero: tovarga bog‘langan slayd avval o‘sha tovarni, keyin shu kategoriyadagi boshqalarini ko‘rsatadi',
);
const firstCover = withPhotos[0].images[0];
ok(firstCover.thumb_width > 0 && photoHome.includes(`srcset="${firstCover.thumb_url} ${firstCover.thumb_width}w, `), 'rasm: srcset kichik nusxaning haqiqiy enini ko‘rsatadi');
ok(photoHome.includes('class="card__media art has-cutout"') && photoHome.includes('class="card__img card__img--cutout"'), 'kartochka: fonsiz rasm kartochka foni ustida, kesilmasdan chiqadi');
ok(!/<img class="card__img card__img--cutout"[^>]*background-color/.test(photoHome), 'kartochka: fonsiz rasm ortiga fon rangi qo‘yilmaydi');
ok(!photoHome.includes('badges--inline'), 'kartochka: fonsiz rasmda belgilar rasm burchagida turadi');
ok(photoHome.includes('index__mini index__mini--cutout') && photoHome.includes('index__thumb art has-cutout'), 'kategoriyalar: qator yonida tovar rasmlari chiqadi');
ok(photoHome.includes('spotlight__frame spotlight__frame--cutout'), 'tanlov: fonsiz rasm katta kartochkada chiqadi');
const cutoutPage = await (await request(`/tovar/${withPhotos[0].slug}`)).text();
ok(cutoutPage.includes('gallery__item art has-cutout') && cutoutPage.includes('class="is-cutout"'), 'tovar sahifasi: fonsiz rasm kesilmasdan ko‘rsatiladi');
const fitHome = await (await request('/fit')).text();
ok(fitHome.includes('hero__glyph') && !fitHome.includes('data-deck-card'), 'hero: rasmsiz bo‘lim (FIT) chizma belgida qoladi');

// Oddiy surat (foni bor, o'z yozuvi bo'lishi mumkin): ramkada chiqadi, belgilar rasm ostidagi qatorda
const plainA = repo.insertImage(images.storeImage({ full: OPAQUE, color: '#223344' }));
const plainB = repo.insertImage(images.storeImage({ full: OPAQUE }));
eq(plainA.cutout, false, 'rasm: oddiy surat fonsiz deb belgilanmaydi');
const plainId = repo.createProduct({
  brand: 'fit', category_id: null, name: 'Oddiy suratli sinov', tagline: '', description: '', features: '', price: 5000, old_price: 9000,
  badge_new: 1, badge_hit: 0, featured: 0, visible: 1, dest_type: 'default', uzum_url: '', channel_url: '', dm_username: '', art: '',
}, [plainA.id, plainB.id]);
const plainSlide = repo.createSlide({
  brand: 'fit', kicker: '', title: 'Suratli slayd', subtitle: '', cta_label: '', link_type: 'product', link_value: String(plainId), image_id: null, art: 'tee', tone: '', visible: 1,
});
const plainFit = await (await request('/fit')).text();
ok(plainFit.includes('class="deck" data-deck') && !plainFit.includes('deck--cutout'), 'hero: oddiy suratlar kartochkalar to‘plami bo‘lib chiqadi');
ok(plainFit.includes('class="card__media art has-photo"') && plainFit.includes('class="badges badges--inline"'), 'kartochka: oddiy suratda belgilar rasm ustida emas, matn qatorida');
ok(plainFit.includes(`style="background-color:#223344"`), 'kartochka: oddiy surat yuklanguncha o‘rtacha rangi ko‘rinadi');
repo.deleteSlide(plainSlide);
repo.deleteProduct(plainId);

// Slaydning o'z rasmi bo'lsa — butun ekranli fon (3D sahna emas)
const slideImage = repo.insertImage(images.storeImage({ full: PNG }));
const photoSlide = repo.createSlide({
  brand: 'fit', kicker: '', title: 'Rasmli slayd', subtitle: '', cta_label: '', link_type: 'catalog', link_value: '', image_id: slideImage.id, art: 'tee', tone: '', visible: 1,
});
ok((await (await request('/fit')).text()).includes('hero__slide hero__slide--photo'), 'hero: rasm yuklangan slayd butun ekranli fon bilan chiqadi');
repo.deleteSlide(photoSlide);

// Yashirilgan tovarlarning rasmlari slaydga chiqmaydi
const categorySlide = lootSlides.find((slide) => slide.link_type === 'category');
const inCategory = withPhotos.filter((item) => String(item.category_id) === String(categorySlide.link_value));
for (const item of inCategory) repo.patchProduct(item.id, 'visible', 0);
const hiddenHome = await (await request('/')).text();
ok(hiddenHome.includes('hero__glyph') && !inCategory.some((item) => hiddenHome.includes(item.images[0].thumb_url)), 'hero: yashirilgan tovarlar rasmi slaydda ko‘rinmaydi');
for (const item of inCategory) repo.patchProduct(item.id, 'visible', 1);
eq(fs.readdirSync(uploadsDir).length, baseFiles, 'rasm: sinovdan keyin uploads papkasida ortiqcha fayl qolmaydi');

// Loyihadagi rasmlar yangilanganda (npm run catalog -- --replace-images): katalog qo'ygan rasmlar almashtiriladi,
// admin paneldan yuklangan rasmga tegilmaydi
const ownProduct = repo.getProduct(seeded[1].id);
const ownImage = repo.insertImage(images.storeImage({ full: OPAQUE }));
repo.updateProduct(ownProduct.id, ownProduct, [ownImage.id]);
const oldFirst = repo.getProduct(seeded[0].id).images.map((image) => image.id);
const swapped = catalog.importCatalogMedia({ replace: true });
ok(
  swapped.replaced === CATALOG_PRODUCTS.length - 1 && swapped.kept === 1 && swapped.failed.length === 0,
  'katalog: rasmlar yangilanganda katalog qo‘ygan rasmlar almashtiriladi',
  JSON.stringify(swapped),
);
const newFirst = repo.getProduct(seeded[0].id).images;
ok(
  newFirst.length === oldFirst.length && newFirst.every((image) => image.cutout && !oldFirst.includes(image.id)) && oldFirst.every((id) => !repo.getImage(id)),
  'katalog: almashtirilgan eski rasm bazadan o‘chadi, yangisi fonsiz',
);
eq(repo.getProduct(ownProduct.id).images[0].id, ownImage.id, 'katalog: admin yuklagan rasm almashtirilmaydi');
eq(catalog.importCatalogMedia({ replace: true, force: true }).replaced, CATALOG_PRODUCTS.length, 'katalog: majburlab almashtirish admin yuklaganini ham almashtiradi');
ok(!repo.getImage(ownImage.id), 'katalog: majburlab almashtirilgan rasm o‘chiriladi');
eq(fs.readdirSync(uploadsDir).length, baseFiles, 'katalog: almashtirishdan keyin uploads papkasida ortiqcha fayl qolmaydi');

// Baza sozlamasi: kutish vaqti boshqa buyruqlardan OLDIN turadi (aks holda baza band paytida server yiqiladi)
const dbSource = fs.readFileSync(new URL('../server/db/index.js', import.meta.url), 'utf8');
ok(dbSource.indexOf('PRAGMA busy_timeout') > 0 && dbSource.indexOf('PRAGMA busy_timeout') < dbSource.indexOf('PRAGMA journal_mode'), 'baza: band bo‘lsa kutadi (busy_timeout birinchi buyruq)');

// ---- Admin himoyasi -----------------------------------------------------------
const adminExtra = await import('./check-admin.js').catch((err) => (err.code === 'ERR_MODULE_NOT_FOUND' ? null : Promise.reject(err)));
if (adminExtra) await adminExtra.run({ request, ok, eq, repo, PNG, ORIGIN, password: process.env.ADMIN_PASSWORD });

// ---- Natija -------------------------------------------------------------------
closeDb();
fs.rmSync(tmp, { recursive: true, force: true });

if (failures.length) {
  console.error(`\n  ${failures.length} ta tekshiruv o‘tmadi (${passed} tasi o‘tdi):\n`);
  for (const line of failures) console.error(`   ✗ ${line}`);
  console.error('');
  process.exit(1);
}
console.log(`\n  Hammasi joyida: ${passed} ta tekshiruv o‘tdi.\n`);
