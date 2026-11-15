// Saytning qayta ishlatiladigan bo'laklari: tovar kartochkasi, karusel, narx, tugmalar.
import { html, raw, attrs } from '../lib/html.js';
import { formatNumber, discountPercent, productCode, words } from '../lib/text.js';
import { resolveDestination } from '../lib/links.js';
import { artSvg, toneFor, toneStyle } from './art.js';
import { icon, destIcon } from './icons.js';
import { productUrl } from './context.js';

/** Matnni so'zma-so'z ochiladigan qilib o'raydi (CSS .split bilan ishlaydi). */
export function splitWords(text, start = 0) {
  return words(text).map(
    (word, i) => html`<span class="w"><span style="--w:${start + i}">${word}</span></span>${' '}`,
  );
}

const two = (n) => String(n).padStart(2, '0');

export function kicker(label, number = null) {
  return html`<p class="kicker" data-reveal>${number != null ? html`<span class="kicker__n">${two(number)}</span>` : ''}${label}</p>`;
}

// ---- Rasm ------------------------------------------------------------------

function thumbWidth(image) {
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  return Math.max(1, Math.round(image.width * scale));
}

export function picture(image, { alt = '', sizes = '100vw', eager = false, className = '' } = {}) {
  const hasThumb = image.thumb_url !== image.url;
  return html`<img${attrs({
    class: className || null,
    src: hasThumb ? image.thumb_url : image.url,
    srcset: hasThumb ? `${image.thumb_url} ${thumbWidth(image)}w, ${image.url} ${image.width}w` : null,
    sizes: hasThumb ? sizes : null,
    width: image.width,
    height: image.height,
    alt,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : null,
    style: image.color ? `background-color:${image.color}` : null,
  })}>`;
}

export const artKeyOf = (product) => product.art || product.category?.art || 'box';

// ---- Narx va belgilar --------------------------------------------------------

export function price(ctx, product, className = 'price') {
  if (!ctx.showPrices || product.price == null) return '';
  const off = discountPercent(product.price, product.old_price);
  return html`<p class="${className}">
    <span class="price__now">${formatNumber(product.price)} <small>${ctx.t.currency}</small></span>
    ${off ? html`<s class="price__old">${formatNumber(product.old_price)}</s>` : ''}
  </p>`;
}

export function badges(ctx, product) {
  const off = ctx.showPrices ? discountPercent(product.price, product.old_price) : 0;
  const list = [];
  if (product.badge_new) list.push(html`<span class="badge badge--new">${ctx.t.product.new}</span>`);
  if (product.badge_hit) list.push(html`<span class="badge badge--hit">${ctx.t.product.hit}</span>`);
  if (off) list.push(html`<span class="badge badge--sale">−${off}%</span>`);
  return list.length ? html`<div class="badges">${list}</div>` : '';
}

// ---- Tovar kartochkasi -------------------------------------------------------

export function productCard(ctx, product, { eager = false, sizes = '(min-width: 1024px) 24vw, (min-width: 640px) 34vw, 68vw' } = {}) {
  const { t } = ctx;
  const name = ctx.tr(product, 'name');
  const tone = toneFor(product.brand, product.id);
  const dest = resolveDestination(product, ctx.settings);
  // Sozlamada "kartochka bosilganda to'g'ridan-to'g'ri havolaga" tanlangan bo'lsa
  const direct = ctx.settings.card_click === 'direct' && dest;
  const [cover, second] = product.images;

  const media = cover
    ? html`${picture(cover, { alt: name, sizes, eager, className: 'card__img' })}${second ? picture(second, { sizes, className: 'card__img card__img--alt' }) : ''}`
    : html`<div class="card__art">${artSvg(artKeyOf(product))}</div>`;

  const linkAttrs = direct
    ? attrs({ href: dest.url, target: '_blank', rel: 'noopener', 'data-track': dest.type })
    : attrs({ href: productUrl(product), 'data-card-link': true });

  return html`<article class="card" data-product="${product.id}">
    <a class="card__link"${linkAttrs}>
      <div class="card__media art${cover ? ' has-photo' : ''}" style="${toneStyle(tone)}" data-vt-media>
        ${media}
        ${badges(ctx, product)}
        <span class="card__code" aria-hidden="true">${productCode(product)}</span>
      </div>
      <div class="card__body">
        ${product.category ? html`<p class="card__cat">${product.category.name}</p>` : ''}
        <h3 class="card__name">${name}</h3>
        ${price(ctx, product)}
      </div>
    </a>
    ${dest && !direct
      ? html`<div class="card__overlay">
          <a class="card__cta" href="${dest.url}" target="_blank" rel="noopener" data-track="${dest.type}" aria-label="${t.dest[dest.type].cta}: ${name} (${t.product.opensNewTab})">
            <span class="card__cta-label">${t.dest[dest.type].short}</span>${icon('arrow-up-right')}
          </a>
        </div>`
      : ''}
  </article>`;
}

// ---- Bo'lim sarlavhasi va karusel -------------------------------------------

export function sectionHead({ label, number = null, title, tools = '' }) {
  return html`<div class="wrap section__head">
    <div class="section__titles">
      ${kicker(label, number)}
      <h2 class="section__title split" data-reveal="split">${splitWords(title)}</h2>
    </div>
    ${tools ? html`<div class="section__tools" data-reveal>${tools}</div>` : ''}
  </div>`;
}

export function linkArrow(href, label, extra = '') {
  return html`<a class="link-arrow" href="${href}"${raw(extra)}><span>${label}</span>${icon('arrow-right')}</a>`;
}

export function carousel(ctx, { label, number, title, products, moreHref = null, eager = false, id = null }) {
  if (!products.length) return '';
  const { t } = ctx;
  const tools = html`
    ${moreHref ? linkArrow(moreHref, t.home.seeAll) : ''}
    <div class="carousel__nav">
      <button class="round" type="button" data-carousel-prev aria-label="${t.hero.prev}">${icon('arrow-left')}</button>
      <button class="round" type="button" data-carousel-next aria-label="${t.hero.next}">${icon('arrow-right')}</button>
    </div>`;
  return html`<section class="section section--carousel"${attrs({ id })} data-carousel>
    ${sectionHead({ label, number, title, tools })}
    <div class="carousel" data-cursor="drag">
      <ul class="carousel__track" data-carousel-track role="list">
        ${products.map(
          (product, i) => html`<li class="carousel__item" data-reveal style="--d:${Math.min(i, 6) * 70}">${productCard(ctx, product, { eager: eager && i < 4 })}</li>`,
        )}
      </ul>
    </div>
    <div class="wrap"><div class="carousel__progress" aria-hidden="true"><i data-carousel-bar></i></div></div>
  </section>`;
}

// ---- Tugmalar ---------------------------------------------------------------

/** Tovarning asosiy tugmasi (Uzum / Telegram kanal / lichka) */
export function destButton(ctx, dest, { className = 'btn btn--primary btn--xl', label = null } = {}) {
  const text = label || ctx.t.dest[dest.type].cta;
  return html`<a class="${className}" href="${dest.url}" target="_blank" rel="noopener" data-track="${dest.type}">
    ${icon(destIcon(dest.type), 'icon btn__lead')}<span>${text}</span>${icon('arrow-up-right', 'icon btn__arrow')}
  </a>`;
}

export function grid(ctx, products, { eager = false } = {}) {
  return html`<ul class="grid" role="list" data-reveal-group>
    ${products.map(
      (product, i) => html`<li class="grid__item" data-reveal style="--d:${(i % 4) * 70}">${productCard(ctx, product, {
        eager: eager && i < 4,
        sizes: '(min-width: 1280px) 22vw, (min-width: 860px) 30vw, 46vw',
      })}</li>`,
    )}
  </ul>`;
}
