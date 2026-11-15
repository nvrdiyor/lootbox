// Tovar sahifasi: rasmlar, nom, narx, asosiy tugma (Uzum / Telegram kanal / lichka),
// tavsif, xususiyatlar va o'xshash tovarlar.
import { html, raw, paragraphs } from '../../lib/html.js';
import { parseFeatures, productCode, truncate } from '../../lib/text.js';
import { resolveDestination, otherDestinations } from '../../lib/links.js';
import { listProducts } from '../../db/repo.js';
import { artSvg, toneFor, toneStyle } from '../art.js';
import { icon, destIcon } from '../icons.js';
import { categoryUrl, productUrl } from '../context.js';
import { page } from '../layout.js';
import { picture, price, badges, carousel, destButton, artKeyOf, mediaKind } from '../components.js';

const OTHER_LABEL = { uzum: 'otherUzum', channel: 'otherChannel', dm: 'otherDm' };

function gallery(ctx, product, name, tone) {
  const { t } = ctx;
  const images = product.images;
  if (!images.length) {
    return html`<div class="gallery gallery--single">
      <div class="gallery__item gallery__item--art art" id="product-stage" data-stage style="${toneStyle(tone)}">
        ${artSvg(artKeyOf(product))}
        <span class="gallery__note">${t.product.noPhoto}</span>
      </div>
    </div>`;
  }
  return html`<div class="gallery${images.length === 1 ? ' gallery--single' : ''}" data-gallery aria-label="${t.product.gallery}">
      ${images.map((image, i) => {
        // Fonsiz rasm (tovarning o'zi) kartochka foni ustida turadi; 3:4 dan ancha farq qiladigan surat
        // kesilmaydi — to'liq ko'rsatiladi
        const whole = Math.abs(image.width / image.height - 0.75) > 0.06;
        const style = image.cutout ? toneStyle(tone) : image.color ? `background-color:${image.color}` : '';
        return html`<button class="gallery__item art has-${mediaKind(image)}" type="button" data-zoom="${image.url}"${i === 0 ? raw(' id="product-stage" data-stage') : ''}
          ${style ? raw(`style="${style}"`) : ''}
          aria-label="${t.product.zoom}: ${t.product.photo(i + 1, images.length)}">
          ${picture(image, { alt: i === 0 ? name : `${name} — ${i + 1}`, sizes: '(min-width: 1024px) 30vw, 92vw', eager: i < 2, className: image.cutout ? 'is-cutout' : whole ? 'is-whole' : '' })}
        </button>`;
      })}
    </div>
    ${images.length > 1
      ? html`<div class="gallery__count" aria-hidden="true">${images.map((_, i) => html`<i data-gallery-dot${i === 0 ? raw(' class="is-active"') : ''}></i>`)}</div>`
      : ''}`;
}

function lightbox(ctx, count) {
  const { t } = ctx;
  return html`<dialog class="lightbox" data-lightbox aria-label="${t.product.gallery}">
    <img class="lightbox__img" data-lightbox-img alt="">
    <button class="round lightbox__close" type="button" data-lightbox-close aria-label="${t.nav.close}">${icon('close')}</button>
    ${count > 1
      ? html`<button class="round lightbox__prev" type="button" data-lightbox-prev aria-label="${t.hero.prev}">${icon('arrow-left')}</button>
          <button class="round lightbox__next" type="button" data-lightbox-next aria-label="${t.hero.next}">${icon('arrow-right')}</button>
          <span class="lightbox__count" data-lightbox-count></span>`
      : ''}
  </dialog>`;
}

export function productPage(ctx, product) {
  const { t, brand, settings } = ctx;
  const name = ctx.tr(product, 'name');
  const tagline = ctx.tr(product, 'tagline');
  const description = ctx.tr(product, 'description');
  const features = parseFeatures(ctx.tr(product, 'features'));
  const tone = toneFor(product.brand, product.id);
  const dest = resolveDestination(product, settings);
  const others = dest && settings.show_other_links !== '0' ? otherDestinations(product, settings, dest.type) : [];
  const category = product.category;

  let related = category
    ? listProducts({ brand: product.brand, categoryId: category.id, visibleOnly: true, excludeId: product.id, limit: 12 })
    : [];
  if (related.length < 4) {
    const seen = new Set([product.id, ...related.map((item) => item.id)]);
    const more = listProducts({ brand: product.brand, visibleOnly: true, limit: 16 }).filter((item) => !seen.has(item.id));
    related = [...related, ...more].slice(0, 12);
  }

  const body = html`
    <article class="product" data-product="${product.id}" data-view-product="${product.id}">
      <div class="wrap product__grid">
        <div class="product__gallery">${gallery(ctx, product, name, tone)}</div>

        <div class="product__info">
          <nav class="crumbs" aria-label="${t.nav.home}">
            <a href="${brand.home}">${brand.name}</a><span aria-hidden="true">/</span>
            <a href="${brand.catalog}">${t.catalog.title}</a>
            ${category ? html`<span aria-hidden="true">/</span><a href="${categoryUrl(brand.key, category)}">${category.name}</a>` : ''}
          </nav>
          ${badges(ctx, product)}
          <h1 class="product__title">${name}</h1>
          ${tagline ? html`<p class="product__tagline">${tagline}</p>` : ''}
          ${price(ctx, product, 'price price--xl')}

          <div class="product__buy" data-buy-anchor>
            ${dest
              ? html`${destButton(ctx, dest)}
                  ${others.length
                    ? html`<div class="product__others">
                        ${others.map(
                          (item) => html`<a class="btn btn--ghost" href="${item.url}" target="_blank" rel="noopener" data-track="${item.type}">
                            ${icon(destIcon(item.type), 'icon btn__lead')}<span>${t.dest[OTHER_LABEL[item.type]]}</span>
                          </a>`,
                        )}
                      </div>`
                    : ''}
                  <p class="product__hint">${icon('arrow-up-right')}${t.dest[dest.type].hint}</p>`
              : html`<p class="product__soon">${t.product.soon}</p>`}
          </div>

          ${description
            ? html`<section class="product__block">
                <h2 class="product__h">${t.product.description}</h2>
                <div class="prose">${paragraphs(description)}</div>
              </section>`
            : ''}

          ${features.length
            ? html`<section class="product__block">
                <h2 class="product__h">${t.product.features}</h2>
                <dl class="specs">
                  ${features.map((item) => html`<div class="specs__row">
                    ${item.key ? html`<dt>${item.key}</dt><dd>${item.value}</dd>` : html`<dd class="specs__solo">${item.value}</dd>`}
                  </div>`)}
                </dl>
              </section>`
            : ''}

          <div class="product__meta">
            <span>${t.product.code}: ${productCode(product)}</span>
            <button class="product__share" type="button" data-share data-copied="${t.product.copied}">${icon('share')}<span>${t.product.share}</span></button>
          </div>
        </div>
      </div>

      ${dest
        ? html`<div class="buybar" data-buybar>
            <div class="buybar__info">
              <p class="buybar__name">${name}</p>
              ${price(ctx, product)}
            </div>
            ${destButton(ctx, dest, { className: 'btn btn--primary', label: t.dest[dest.type].short })}
          </div>`
        : ''}
    </article>

    ${carousel(ctx, { label: t.product.relatedKicker, title: t.product.related, products: related, moreHref: category ? categoryUrl(brand.key, category) : brand.catalog })}
    ${product.images.length ? lightbox(ctx, product.images.length) : ''}`;

  const cover = product.images[0];
  const summary = tagline || truncate(description, 160);
  return page(ctx, {
    title: `${name} — ${brand.name}`,
    description: summary,
    canonical: productUrl(product),
    ogImage: cover ? cover.url : null,
    ogType: 'product',
    pageName: 'product',
    adminLink: { href: `/admin/products/${product.id}`, label: t.admin.editProduct },
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: truncate(description || tagline, 500) || undefined,
      sku: productCode(product),
      brand: { '@type': 'Brand', name: brand.name },
      category: category?.name,
      image: product.images.map((image) => ctx.origin + image.url),
      offers:
        ctx.showPrices && product.price != null
          ? { '@type': 'Offer', price: product.price, priceCurrency: 'UZS', url: ctx.origin + productUrl(product) }
          : undefined,
    },
  });
}
