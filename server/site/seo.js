// Qidiruv tizimlari (Google, Yandex) uchun hamma narsa bir joyda: sahifa sarlavhasi, tavsifi, qidiruv so'zlari,
// rasm izohi va tuzilgan ma'lumot (schema.org).
//
// Qoida: admin panelda tovar yoki kategoriyaga o'z matni yozilgan bo'lsa — o'sha ishlatiladi. Yozilmagan bo'lsa,
// shu yerda avtomatik tuziladi: tovar turi kategoriya yoki tovar nomidan taniladi va odamlar uni qanday nomlar
// bilan qidirishi (skeyt, kovrik, ruscha nomlar) i18n faylidagi `seo.groups` dan olinadi.
//
// `env` — sayt sahifasining konteksti (makeContext) yoki admin panel uchun yengil nusxasi:
//   { t, brand, settings, showPrices?, tr? }
import { formatNumber, truncate, productCode } from '../lib/text.js';
import { resolveDestination } from '../lib/links.js';
import { BRANDS } from './brand.js';
import { categoryUrl, productUrl } from './context.js';

// Tovar turlari: kategoriya (yoki tovar) nomida shu so'zlardan biri uchrasa, o'sha tur
const GROUP_PATTERNS = [
  ['skates', /glayd|glide|skeyt|skate|глайд|скейт/],
  ['switches', /switch|svitch|свитч/],
  ['pads', /gilamcha|kovrik|mouse\s?pad|коврик/],
  ['grips', /grip|грип/],
];

/** Sahifada ko'rinadigan «boshqa nomlar» soni: undan ko'pi so'z yig'indisiga aylanib qoladi */
export const MAX_VISIBLE_TERMS = 6;
const MAX_KEYWORDS = 12;

const APOSTROPHES = /['’‘ʻʼ`´]/g;
const norm = (value) => String(value || '').toLowerCase().replace(APOSTROPHES, '');
const withDot = (value) => {
  const text = String(value || '').trim();
  return !text || /[.!?…]$/.test(text) ? text : `${text}.`;
};
const textOf = (env, row, field) => (env.tr ? env.tr(row, field) : row?.[field]) || '';

/** "kovrik, mousepad; коврик" → ['kovrik', 'mousepad', 'коврик'] (takrorlarsiz) */
export function parseTerms(value) {
  const seen = new Set();
  const out = [];
  for (const part of String(value || '').split(/[,;\n]+/)) {
    const term = part.replace(/\s+/g, ' ').trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  return out;
}

function groupOf(env, category, product) {
  const groups = env.t.seo?.groups || {};
  const find = (value) => {
    const text = norm(value);
    for (const [key, pattern] of GROUP_PATTERNS) if (groups[key] && pattern.test(text)) return groups[key];
    return null;
  };
  return (category && find(`${category.slug} ${category.name}`)) || (product && find(product.name)) || null;
}

/**
 * Tovar yoki kategoriya odamlar tilida qanday ataladi.
 * @returns {{ group: object|null, custom: boolean, visible: string[], keywords: string[] }}
 *   visible — sahifada ko'rsatiladigan qisqa ro'yxat; keywords — qidiruv tizimlariga beriladigan to'liq ro'yxat;
 *   custom — ro'yxat admin panelda yozilgan (avtomatik emas).
 */
export function searchTerms(env, { category = null, product = null } = {}) {
  const group = groupOf(env, category, product);
  const own = parseTerms(product?.search_terms);
  const inherited = parseTerms(category?.search_terms);
  const custom = own.length > 0 || inherited.length > 0;
  const base = own.length ? own : inherited.length ? inherited : group ? group.terms : [];
  const extra = custom || !group ? [] : group.more;
  return {
    group,
    custom,
    visible: base.slice(0, MAX_VISIBLE_TERMS),
    keywords: [...base, ...extra].slice(0, MAX_KEYWORDS),
  };
}

const hasUzum = (env) => Boolean(env.settings?.[env.brand.key === 'fit' ? 'uzum_shop_fit' : 'uzum_shop_lootbox']);

// ---- Tovar sahifasi --------------------------------------------------------------

/**
 * @returns {{ name, title, description, keywords, alt, terms, auto: { title, description, terms } }}
 *   auto — admin panelda "bo'sh qoldirsangiz shunday bo'ladi" deb ko'rsatiladigan avtomatik qiymatlar.
 */
export function productSeo(env, product) {
  const { t, brand } = env;
  const name = textOf(env, product, 'name');
  const terms = searchTerms(env, { category: product.category, product });
  const autoTerms = searchTerms(env, { category: product.category, product: { ...product, search_terms: '' } });

  // Sarlavhaga tovar turining odamlar ishlatadigan nomi qo'shiladi (nomning o'zida bo'lmasa)
  const item = terms.custom ? terms.visible[0] : terms.group?.item || '';
  const extraItem = item && !norm(name).includes(norm(item)) ? item : '';
  const autoTitle = extraItem ? `${name} · ${extraItem} | ${brand.name}` : `${name} | ${brand.name}`;

  // Tavsif tovar nomi bilan boshlanadi: bir e'lonning variantlari (rang, model) bir xil qisqa izohga ega bo'ladi,
  // nomsiz ularning tavsifi ham bir xil chiqib qolardi (qidiruv tizimlari takroriy tavsifni xato deb ko'rsatadi)
  const tagline = textOf(env, product, 'tagline');
  const parts = [withDot(name), withDot(tagline || truncate(textOf(env, product, 'description'), 120))];
  if (env.showPrices !== false && product.price != null) parts.push(withDot(t.seo.price(formatNumber(product.price))));
  if (resolveDestination(product, env.settings)?.type === 'uzum') parts.push(withDot(t.seo.viaUzum));
  if (!terms.custom && terms.group?.ru) parts.push(withDot(terms.group.ru));
  const autoDescription = truncate(parts.filter(Boolean).join(' '), 260);

  return {
    name,
    terms,
    title: product.meta_title || autoTitle,
    description: product.meta_description || autoDescription,
    keywords: terms.keywords,
    // Rasm izohi: rasmda nima borligi — tovar nomi va odamlar ishlatadigan nomi
    alt: extraItem ? `${name} — ${extraItem}` : name,
    auto: { title: autoTitle, description: autoDescription, terms: autoTerms.visible },
  };
}

// ---- Kategoriya va katalog ---------------------------------------------------------

export function categorySeo(env, category, products = []) {
  const { t, brand } = env;
  const name = textOf(env, category, 'name');
  const terms = searchTerms(env, { category });
  const autoTerms = searchTerms(env, { category: { ...category, search_terms: '' } });

  const short = terms.custom ? terms.visible.slice(0, 2).join(', ') : terms.group?.short || '';
  const autoTitle = short ? `${name} (${short}) — ${t.seo.prices} | ${brand.name}` : `${name} | ${brand.name}`;

  const prices = env.showPrices === false ? [] : products.map((item) => item.price).filter((value) => value != null);
  const facts = [
    products.length ? t.seo.kinds(products.length) : '',
    prices.length ? t.seo.priceFrom(formatNumber(Math.min(...prices))) : '',
  ].filter(Boolean).join(', ');
  const parts = [withDot(textOf(env, category, 'tagline')), withDot(facts)];
  if (hasUzum(env)) parts.push(withDot(t.seo.viaUzum));
  if (!terms.custom && terms.group?.ru) parts.push(withDot(terms.group.ru));
  const autoDescription = truncate(parts.filter(Boolean).join(' '), 240);

  const autoIntro = terms.group?.intro || '';
  return {
    name,
    terms,
    title: category.meta_title || autoTitle,
    description: category.meta_description || autoDescription,
    keywords: terms.keywords,
    intro: category.intro || autoIntro,
    auto: { title: autoTitle, description: autoDescription, terms: autoTerms.visible, intro: autoIntro },
  };
}

/** Katalogning bosh sahifasi: kategoriya nomlari sarlavhada va tavsifda, har biridan bir nechta qidiruv so'zi */
export function catalogSeo(env, categories = [], products = []) {
  const { t, brand } = env;
  const names = categories.map((cat) => textOf(env, cat, 'name')).filter(Boolean);
  // Tavsif bosh sahifanikidan farq qilishi kerak (takroriy tavsif — qidiruv tizimlari uchun xato): bu yerda
  // katalogda nima borligi sanaladi
  const prices = env.showPrices === false ? [] : products.map((item) => item.price).filter((value) => value != null);
  const facts = [
    products.length ? t.seo.kinds(products.length) : '',
    prices.length ? t.seo.priceFrom(formatNumber(Math.min(...prices))) : '',
  ].filter(Boolean).join(', ');
  const lead = names.length ? `${t.seo.catalogOf(brand.name)}: ${names.join(', ')}` : t.seo.catalogOf(brand.name);
  const description = truncate([withDot(facts ? `${lead} — ${facts}` : lead), hasUzum(env) ? withDot(t.seo.viaUzum) : ''].filter(Boolean).join(' '), 260);
  const keywords = [];
  for (const cat of categories) {
    for (const term of searchTerms(env, { category: cat }).visible.slice(0, 3)) {
      if (keywords.length < MAX_KEYWORDS && !keywords.includes(term)) keywords.push(term);
    }
  }
  return {
    title: names.length ? `${t.catalog.title} — ${names.join(', ')} | ${brand.name}` : `${t.catalog.title} | ${brand.name}`,
    description,
    keywords,
  };
}

export function homeSeo(env, categories = []) {
  const { t, brand, settings } = env;
  return {
    title: (brand.key === 'fit' ? settings.seo_title_fit : settings.seo_title_lootbox) || `${brand.name} — ${t.brand[brand.key].line}`,
    description: (brand.key === 'fit' ? settings.seo_desc_fit : settings.seo_desc_lootbox) || '',
    keywords: catalogSeo(env, categories).keywords,
  };
}

// ---- Tuzilgan ma'lumot (schema.org, JSON-LD) -----------------------------------------
// Qidiruv tizimi sahifani "tushunishi" uchun: bu do'kon, bu tovar, narxi shuncha, bu sahifa katalogda shu yerda turadi.

const SITE_NAME = BRANDS.lootbox.name;
const orgId = (ctx) => `${ctx.origin}/#org`;

/** Bir nechta tugunni bitta <script type="application/ld+json"> ga yig'adi */
export const ldGraph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.flat().filter(Boolean) });

export function organizationLd(ctx) {
  const { links } = ctx;
  return {
    '@type': 'Organization',
    '@id': orgId(ctx),
    name: SITE_NAME,
    url: `${ctx.origin}/`,
    logo: `${ctx.origin}/favicon.svg`,
    areaServed: { '@type': 'Country', name: 'Uzbekistan' },
    sameAs: [links.uzum, links.channel, links.instagram, links.tiktok, links.youtube].filter(Boolean),
  };
}

export function websiteLd(ctx) {
  return {
    '@type': 'WebSite',
    '@id': `${ctx.origin}/#site`,
    name: SITE_NAME,
    url: `${ctx.origin}/`,
    inLanguage: ctx.t.lang,
    publisher: { '@id': orgId(ctx) },
  };
}

/** Sahifaning saytdagi o'rni: [{ name, path }] — birinchisi bosh sahifa */
export function breadcrumbLd(ctx, trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: ctx.origin + item.path,
    })),
  };
}

export function productLd(ctx, product, seo) {
  const url = ctx.origin + productUrl(product);
  const description = textOf(ctx, product, 'description') || textOf(ctx, product, 'tagline');
  return {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: seo.name,
    alternateName: seo.terms.visible.length ? seo.terms.visible : undefined,
    description: truncate(description, 500) || undefined,
    sku: productCode(product),
    url,
    brand: { '@type': 'Brand', name: ctx.brand.name },
    category: product.category?.name,
    image: product.images.length ? product.images.map((image) => ctx.origin + image.url) : undefined,
    offers:
      ctx.showPrices && product.price != null
        ? {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'UZS',
            url,
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: SITE_NAME, url: `${ctx.origin}/` },
          }
        : undefined,
  };
}

/** Katalog sahifasidagi tovarlar ro'yxati */
export function itemListLd(ctx, products) {
  if (!products.length) return null;
  return {
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 60).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: textOf(ctx, product, 'name'),
      url: ctx.origin + productUrl(product),
    })),
  };
}

/** Saytdagi yo'l: brend → katalog → kategoriya (→ tovar) */
export function trailOf(ctx, { category = null, product = null, catalog = true } = {}) {
  const { t, brand } = ctx;
  const trail = [{ name: brand.name, path: brand.home }];
  if (catalog) trail.push({ name: t.catalog.title, path: brand.catalog });
  if (category) trail.push({ name: textOf(ctx, category, 'name'), path: categoryUrl(brand.key, category) });
  if (product) trail.push({ name: textOf(ctx, product, 'name'), path: productUrl(product) });
  return trail;
}
