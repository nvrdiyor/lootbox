// Katalog: kategoriya tugmachalari, saralash va tovarlar to'ri.
import { html, raw, attrs, paragraphs } from '../../lib/html.js';
import { listProducts } from '../../db/repo.js';
import { icon } from '../icons.js';
import { categoryUrl } from '../context.js';
import { page } from '../layout.js';
import { splitWords, grid, alsoKnown } from '../components.js';
import { categorySeo, catalogSeo, breadcrumbLd, itemListLd, trailOf, ldGraph } from '../seo.js';

const SORTS = ['sort', 'new', 'price_asc', 'price_desc'];

export function catalogPage(ctx, category) {
  const { t, brand, categories } = ctx;
  const sort = SORTS.includes(ctx.query.get('sort')) ? ctx.query.get('sort') : 'sort';
  const products = listProducts({
    brand: brand.key,
    categoryId: category?.id,
    visibleOnly: true,
    order: sort,
  });
  // "Hammasi" soni haqiqiy tovarlar sonidan olinadi (kategoriyasiz tovarlar ham hisobda)
  const total = category ? listProducts({ brand: brand.key, visibleOnly: true }).length : products.length;
  const base = category ? categoryUrl(brand.key, category) : brand.catalog;
  const sortQuery = sort === 'sort' ? '' : `?sort=${sort}`;
  const heading = category ? ctx.tr(category, 'name') : t.catalog.title;
  const tagline = category ? ctx.tr(category, 'tagline') : '';
  // Qidiruv tizimlari uchun: sarlavha, tavsif, kategoriya sahifasida esa kirish matni va «boshqa nomlari»
  const seo = category ? categorySeo(ctx, category, products) : catalogSeo(ctx, categories, products);

  const sortLabels = {
    sort: t.catalog.sortDefault,
    new: t.catalog.sortNew,
    price_asc: t.catalog.sortPriceAsc,
    price_desc: t.catalog.sortPriceDesc,
  };

  const chip = (href, label, count, active) =>
    html`<a${attrs({ class: `chip${active ? ' is-active' : ''}`, href: href + sortQuery, 'aria-current': active ? 'page' : null })}>${label}<i>${count}</i></a>`;

  const body = html`
    <section class="pagehead">
      <div class="wrap">
        <nav class="crumbs" aria-label="${t.nav.home}">
          <a href="${brand.home}">${brand.name}</a><span aria-hidden="true">/</span>
          ${category
            ? html`<a href="${brand.catalog}">${t.catalog.title}</a><span aria-hidden="true">/</span><span aria-current="page">${heading}</span>`
            : html`<span aria-current="page">${t.catalog.title}</span>`}
        </nav>
        <div class="pagehead__row">
          <h1 class="pagehead__title split" data-reveal="split">${splitWords(heading)}</h1>
          <p class="pagehead__meta" data-reveal>${t.catalog.count(products.length)}</p>
        </div>
        ${tagline ? html`<p class="pagehead__text" data-reveal>${tagline}</p>` : ''}
        ${category && seo.intro ? html`<div class="pagehead__intro" data-reveal>${paragraphs(seo.intro)}</div>` : ''}
        ${category ? alsoKnown(ctx, seo.terms.visible, 'also pagehead__also') : ''}
      </div>
    </section>

    <div class="filters">
      <div class="wrap filters__inner">
        <nav class="chips" aria-label="${t.nav.categories}">
          ${chip(brand.catalog, t.catalog.all, total, !category)}
          ${categories.map((cat) => chip(categoryUrl(brand.key, cat), ctx.tr(cat, 'name'), cat.product_count, category?.id === cat.id))}
        </nav>
        <form class="sort${sort === 'sort' ? '' : ' is-active'}" method="get" action="${base}" data-sort-form>
          ${icon('sort', 'icon sort__icon')}
          <select name="sort" aria-label="${t.catalog.sort}" autocomplete="off" data-autosubmit>
            ${SORTS.map((key) => html`<option value="${key}"${key === sort ? raw(' selected') : ''}>${sortLabels[key]}</option>`)}
          </select>
          ${icon('chevron-down', 'icon sort__chev')}
          <noscript><button type="submit">OK</button></noscript>
        </form>
      </div>
    </div>

    <div class="wrap">
      ${products.length
        ? grid(ctx, products, { eager: true })
        : html`<section class="section empty">
            <h2 class="section__title">${t.catalog.emptyTitle}</h2>
            <p class="empty__text">${t.catalog.emptyText}</p>
          </section>`}
    </div>`;

  return page(ctx, {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    // Bo'sh sahifa («Bu yerda hozircha tovar yo'q») qidiruvga kirmaydi
    noindex: !products.length,
    canonical: base,
    pageName: 'catalog',
    body,
    // Qidiruv tizimi uchun: sahifaning saytdagi o'rni va undagi tovarlar ro'yxati
    jsonLd: ldGraph(breadcrumbLd(ctx, trailOf(ctx, { category })), itemListLd(ctx, products)),
  });
}
