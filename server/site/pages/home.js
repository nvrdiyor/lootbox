// Bosh sahifa (LOOTBOX uchun "/" va FIT uchun "/fit"): hero slayder, karusellar,
// kategoriyalar ro'yxati, tanlangan tovar, brend haqida, ikkinchi bo'limga o'tish.
import { html, raw } from '../../lib/html.js';
import { parseFeatures, words } from '../../lib/text.js';
import { parseHttpUrl, resolveDestination } from '../../lib/links.js';
import { listProducts, listSlides } from '../../db/repo.js';
import { BRANDS } from '../brand.js';
import { artSvg, toneFor, toneStyle } from '../art.js';
import { icon } from '../icons.js';
import { categoryUrl, productUrl } from '../context.js';
import { page, logo } from '../layout.js';
import { slidePhotos } from '../slide-photos.js';
import {
  splitWords, kicker, picture, price, badges, carousel, sectionHead, linkArrow, destButton, artKeyOf, mediaKind,
} from '../components.js';

const two = (n) => String(n).padStart(2, '0');

/** Slayd tugmasi qayerga olib boradi */
function slideTarget(ctx, slide, products) {
  const catalog = { href: ctx.brand.catalog, external: false };
  if (slide.link_type === 'category') {
    const cat = ctx.categories.find((item) => String(item.id) === String(slide.link_value));
    return cat ? { href: categoryUrl(ctx.brand.key, cat), external: false } : catalog;
  }
  if (slide.link_type === 'product') {
    const product = products.find((item) => String(item.id) === String(slide.link_value));
    return product ? { href: productUrl(product), external: false } : catalog;
  }
  if (slide.link_type === 'url') {
    const value = String(slide.link_value || '').trim();
    // Ichki manzil: "/katalog" kabi. "//" yoki "\" bilan boshqa saytga chiqib ketmasin.
    if (value.startsWith('/')) {
      return value.startsWith('//') || value.includes('\\') ? catalog : { href: value, external: false };
    }
    const url = parseHttpUrl(value);
    return url ? { href: url, external: true } : catalog;
  }
  return catalog;
}

/**
 * 3D sahna: oldinda asosiy rasm, ortida yana ikkitasi. Bosilsa slayd havolasiga olib boradi.
 * Fonsiz rasmlar (tovarning o'zi) ramkasiz, havoda turgandek ko'rsatiladi; oddiy suratlar — kartochka bo'lib.
 */
function deck(photos, { href, external, eager, chips }) {
  const cutout = photos[0].cutout;
  // sizes ataylab kamtarroq: telefonda brauzer to'liq rasmni emas, kichik nusxani tanlasin
  const sizes = cutout ? '(min-width: 1024px) 34vw, 60vw' : '(min-width: 1024px) 26vw, 50vw';
  return html`<div class="deck${cutout ? ' deck--cutout' : ''}" data-deck data-count="${photos.length}">
    <div class="deck__glow"></div>
    <a class="deck__cards" href="${href}"${external} tabindex="-1" aria-hidden="true">
      ${photos.map((image, n) => html`<span class="deck__card${image.cutout ? ' deck__card--cutout' : ''}" data-deck-card data-pos="${n}" data-home="${n}" style="--i:${n}">
        <span class="deck__face">${picture(image, { sizes, eager: eager && n === 0 })}</span>
      </span>`)}
    </a>
    ${chips}
  </div>`;
}

/** Sarlavhadagi har bir gap alohida qatordan boshlanadi: "Silliq sirpanish. / Aniq nishon." */
function titleLines(title) {
  // Faqat tinish belgisidan keyin bo'sh joy kelsa bo'linadi ("11.11", "2.0" bo'linmaydi)
  const sentences = String(title || '').split(/(?<=[.!?])\s+/);
  let offset = 0;
  return sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => {
      const line = html`<span class="hero__line">${splitWords(sentence, offset)}</span>`;
      offset += words(sentence).length;
      return line;
    });
}

function hero(ctx, slides, products) {
  const { t, brand } = ctx;
  const list = slides.length
    ? slides
    : [{ id: 1, kicker: t.brand[brand.key].line, title: brand.name, subtitle: '', cta_label: t.nav.catalog, link_type: 'catalog', link_value: '', image: null, art: brand.key === 'fit' ? 'tee' : 'box', tone: '' }];
  const tones = list.map((slide) => toneFor(brand.key, slide.id, slide.tone));

  const slideHtml = list.map((slide, i) => {
    const target = slideTarget(ctx, slide, products);
    const title = ctx.tr(slide, 'title');
    const subtitle = ctx.tr(slide, 'subtitle');
    const kick = ctx.tr(slide, 'kicker');
    const cta = ctx.tr(slide, 'cta_label') || t.hero.fallbackCta;
    const tag = i === 0 ? 'h1' : 'h2';
    const external = target.external ? raw(' target="_blank" rel="noopener"') : '';
    const chips = html`<span class="hero__chip hero__chip--a" data-tilt-layer>${brand.key === 'fit' ? 'FT' : 'LB'} / ${two(i + 1)}</span>
          ${kick ? html`<span class="hero__chip hero__chip--b" data-tilt-layer>${kick}</span>` : ''}`;
    // Uch xil ko'rinish: yuklangan rasm (butun ekran) → tovar rasmlaridan 3D to'plam → chizma belgi
    const photos = slide.image ? [] : slidePhotos(slide, products);
    let media;
    let kind = '';
    if (slide.image) {
      kind = ' hero__slide--photo';
      media = html`<div class="hero__photo">${picture(slide.image, { sizes: '100vw', eager: i === 0 })}</div>`;
    } else if (photos.length) {
      kind = ' hero__slide--deck';
      media = deck(photos, { href: target.href, external, eager: i === 0, chips });
    } else {
      media = html`<div class="hero__art art" data-tilt>
          <div class="hero__ring hero__ring--a"></div>
          <div class="hero__ring hero__ring--b"></div>
          <div class="hero__glyph" data-tilt-layer>${artSvg(slide.art)}</div>
          ${chips}
        </div>`;
    }
    return html`<article class="hero__slide${kind}${i === 0 ? ' is-active' : ''}" data-hero-slide
        data-tone="${tones[i].color}" style="${toneStyle(tones[i])}" aria-roledescription="slide" aria-label="${i + 1} / ${list.length}"${i === 0 ? '' : raw(' inert')}>
      <div class="hero__media">${media}</div>
      <div class="hero__content">
        <p class="hero__kicker"><span class="hero__index">${two(i + 1)}</span><span class="hero__rule"></span><span>${kick}</span></p>
        ${raw(`<${tag} class="hero__title split">`)}${titleLines(title)}${raw(`</${tag}>`)}
        ${subtitle ? html`<p class="hero__sub">${subtitle}</p>` : ''}
        <div class="hero__actions">
          <a class="btn btn--primary btn--xl" href="${target.href}"${external}><span>${cta}</span>${icon('arrow-right', 'icon btn__arrow')}</a>
          ${target.href !== brand.catalog ? html`<a class="btn btn--ghost btn--xl" href="${brand.catalog}"><span>${t.hero.catalog}</span></a>` : ''}
        </div>
      </div>
    </article>`;
  });

  return html`<section class="hero" data-hero aria-roledescription="carousel" aria-label="${t.hero.label}" style="--hero-tone:${tones[0].color}">
    <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow"></div></div>
    <div class="hero__slides" data-cursor="${list.length > 1 ? 'drag' : ''}">${slideHtml}</div>
    ${list.length > 1
      ? html`<div class="hero__nav wrap">
          <div class="hero__dots">
            ${list.map(
              (slide, i) => html`<button class="hero__dot${i === 0 ? ' is-active' : ''}" type="button" data-hero-go="${i}" aria-label="${t.hero.slide} ${i + 1}"${i === 0 ? raw(' aria-current="true"') : ''}>
                <span class="hero__dot-n">${two(i + 1)}</span><span class="hero__bar"><i></i></span>
              </button>`,
            )}
          </div>
          <div class="hero__arrows">
            <button class="round" type="button" data-hero-prev aria-label="${t.hero.prev}">${icon('arrow-left')}</button>
            <button class="round" type="button" data-hero-next aria-label="${t.hero.next}">${icon('arrow-right')}</button>
          </div>
        </div>`
      : ''}
  </section>`;
}

function marquee(ctx) {
  const text = ctx.brand.key === 'fit' ? ctx.settings.ticker_fit : ctx.settings.ticker_lootbox;
  const items = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!items.length) return '';
  // Lenta uzluksiz aylanishi uchun bir xil ikki guruh ketma-ket turadi. Guruh ichida iboralar
  // to'liq to'plam bo'lib takrorlanadi (tartib buzilmasin va keng ekranda bo'sh joy qolmasin).
  const repeated = Array.from({ length: Math.max(2, Math.ceil(12 / items.length)) }, () => items).flat();
  const group = (hidden) => html`<ul class="marquee__group" role="list"${hidden ? raw(' aria-hidden="true"') : ''}>
    ${repeated.map((item) => html`<li>${item}${icon('star', 'icon marquee__star')}</li>`)}
  </ul>`;
  return html`<div class="marquee" data-marquee><div class="marquee__track">${group(false)}${group(true)}</div></div>`;
}

function categoryIndex(ctx, number, products) {
  const { t, brand, categories } = ctx;
  if (!categories.length) return '';
  // Kategoriyadagi rasmli tovarlarning muqovalari: qator yonida kichik to'plam bo'lib turadi,
  // kategoriyaning o'z rasmi bo'lmasa sichqoncha ostidagi katta rasm ham shulardan olinadi
  const coversOf = (cat) => products.filter((item) => item.category_id === cat.id && item.images.length).slice(0, 3).map((item) => item.images[0]);
  return html`<section class="section section--index" id="kategoriyalar">
    ${sectionHead({ label: t.home.categoriesKicker, number, title: t.home.categoriesTitle })}
    <div class="wrap">
      <ul class="index" role="list" data-reveal-group>
        ${categories.map((cat, i) => {
          const tone = toneFor(brand.key, cat.id);
          const covers = coversOf(cat);
          const cover = cat.image || covers[0] || null;
          return html`<li data-reveal style="--d:${i * 60}">
            <a class="index__row${covers.length ? ' has-stack' : ''}" href="${categoryUrl(brand.key, cat)}" data-index-row style="${toneStyle(tone)}">
              <span class="index__n">${two(i + 1)}</span>
              <span class="index__main">
                <span class="index__name">${ctx.tr(cat, 'name')}</span>
                ${cat.tagline ? html`<span class="index__tag">${ctx.tr(cat, 'tagline')}</span>` : ''}
              </span>
              ${covers.length
                ? html`<span class="index__stack" aria-hidden="true">${covers.map((image, k) => html`<span class="index__mini${image.cutout ? ' index__mini--cutout' : ''}" style="--k:${k}">${picture(image, { sizes: '72px' })}</span>`)}</span>`
                : ''}
              <span class="index__count">${t.catalog.count(cat.product_count)}</span>
              <span class="index__go">${icon('arrow-up-right')}</span>
              <span class="index__thumb art${cover ? ` has-${mediaKind(cover)}` : ''}" aria-hidden="true">
                ${cover ? picture(cover, { sizes: '260px' }) : artSvg(cat.art)}
              </span>
            </a>
          </li>`;
        })}
      </ul>
    </div>
  </section>`;
}

function spotlight(ctx, product, number) {
  if (!product) return '';
  const { t } = ctx;
  const name = ctx.tr(product, 'name');
  const tone = toneFor(product.brand, product.id);
  const dest = resolveDestination(product, ctx.settings);
  const features = parseFeatures(ctx.tr(product, 'features')).slice(0, 4);
  const [cover, second] = product.images;
  const kind = mediaKind(cover);
  let media;
  if (kind === 'cutout') {
    // Fonsiz rasm: tovar kartochka foni ustida turadi va sichqonchaga qarab 3D og'adi
    media = html`<span class="spotlight__frame spotlight__frame--cutout" data-tilt3d>${picture(cover, { alt: name, sizes: '(min-width: 1024px) 44vw, 88vw' })}</span>${badges(ctx, product)}`;
  } else if (kind === 'photo') {
    // Oddiy surat: muqova 3D ramkada, ortidan ikkinchi rasm ko'rinib turadi
    media = html`${second ? html`<span class="spotlight__back" aria-hidden="true">${picture(second, { sizes: '(min-width: 1024px) 30vw, 60vw' })}</span>` : ''}
        <span class="spotlight__frame" data-tilt3d>${picture(cover, { alt: name, sizes: '(min-width: 1024px) 40vw, 80vw' })}</span>`;
  } else {
    media = html`<div class="spotlight__art">${artSvg(artKeyOf(product))}</div>${badges(ctx, product)}`;
  }
  return html`<section class="section spotlight" id="tanlov" data-product="${product.id}" style="${toneStyle(tone)}">
    <div class="wrap spotlight__grid">
      <a class="spotlight__media art${kind ? ` has-${kind}` : ''}" href="${productUrl(product)}" data-reveal="scale" data-card-link data-vt-media aria-label="${name}">
        ${media}
      </a>
      <div class="spotlight__body">
        ${kicker(t.home.spotlightKicker, number)}
        ${kind === 'photo' ? badges(ctx, product, { inline: true }) : ''}
        <h2 class="spotlight__title split" data-reveal="split">${splitWords(name)}</h2>
        ${product.tagline ? html`<p class="spotlight__tagline" data-reveal>${ctx.tr(product, 'tagline')}</p>` : ''}
        ${features.length
          ? html`<dl class="specs" data-reveal-group>
              ${features.map((item, i) => html`<div class="specs__row" data-reveal style="--d:${i * 70}">
                ${item.key ? html`<dt>${item.key}</dt><dd>${item.value}</dd>` : html`<dd class="specs__solo">${item.value}</dd>`}
              </div>`)}
            </dl>`
          : ''}
        <div class="spotlight__foot" data-reveal>
          ${price(ctx, product, 'price price--xl')}
          <div class="spotlight__actions">
            ${dest ? destButton(ctx, dest) : ''}
            <a class="btn btn--ghost btn--xl" href="${productUrl(product)}" data-card-link><span>${t.product.details}</span></a>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function manifesto(ctx, number) {
  const { t, brand, settings, links } = ctx;
  const about = brand.key === 'fit' ? settings.about_fit : settings.about_lootbox;
  if (!about) return '';
  const pillars = [
    links.uzum && { icon: 'bag', title: t.home.pillarUzum, text: t.home.pillarUzumText },
    links.channel && { icon: 'telegram', title: t.home.pillarChannel, text: t.home.pillarChannelText },
    links.dm && { icon: 'chat', title: t.home.pillarDm, text: t.home.pillarDmText },
  ].filter(Boolean);
  return html`<section class="section manifesto" id="brend">
    <div class="wrap">
      ${kicker(t.home.aboutKicker, number)}
      <p class="manifesto__text" data-words>${words(about).map((word) => html`<span>${word}</span>${' '}`)}</p>
      ${pillars.length
        ? html`<ul class="pillars" role="list" data-reveal-group>
            ${pillars.map((item, i) => html`<li class="pillar" data-reveal style="--d:${i * 90}">
              <span class="pillar__icon">${icon(item.icon)}</span>
              <h3 class="pillar__title">${item.title}</h3>
              <p class="pillar__text">${item.text}</p>
            </li>`)}
          </ul>`
        : ''}
    </div>
  </section>`;
}

/** Ikkinchi bo'limga taklif: LOOTBOX sahifasida FIT, FIT sahifasida LOOTBOX */
function otherBrandBand(ctx) {
  const { t, brand } = ctx;
  const other = BRANDS[brand.other];
  const teasers = listProducts({ brand: other.key, visibleOnly: true, limit: 3 });
  if (!teasers.length) return '';
  const toFit = other.key === 'fit';
  return html`<section class="band" id="bolim" data-brand="${other.key}">
    <a class="band__link" href="${other.home}" data-brand-link="${other.key}" aria-label="${toFit ? t.home.fitBandCta : t.home.lootBandCta}">
      <div class="wrap band__grid">
        <div class="band__body">
          <p class="kicker" data-reveal>${toFit ? t.home.fitBandKicker : t.home.lootBandKicker}</p>
          <div class="band__wm" data-reveal="letters">${logo(other.key, toFit ? 'full' : 'lootbox', 'band__logo')}</div>
          <p class="band__text" data-reveal>${toFit ? t.home.fitBandText : t.home.lootBandText}</p>
          <span class="btn btn--primary btn--xl" data-reveal><span>${toFit ? t.home.fitBandCta : t.home.lootBandCta}</span>${icon('arrow-right', 'icon btn__arrow')}</span>
        </div>
        <div class="band__stack" aria-hidden="true" data-reveal-group>
          ${teasers.map((product, i) => {
            const tone = toneFor(product.brand, product.id);
            const [cover] = product.images;
            return html`<div class="band__card art${cover ? ` has-${mediaKind(cover)}` : ''}" style="${toneStyle(tone)};--n:${i}" data-reveal="scale">
              ${cover ? picture(cover, { sizes: '280px' }) : artSvg(artKeyOf(product))}
            </div>`;
          })}
        </div>
      </div>
    </a>
  </section>`;
}

function channelBand(ctx) {
  const { t, links } = ctx;
  if (!links.channel) return '';
  return html`<section class="cta" id="kanal">
    <div class="wrap cta__inner">
      <div>
        <p class="kicker" data-reveal>${icon('telegram', 'icon kicker__icon')}${t.home.channelKicker}</p>
        <h2 class="cta__title split" data-reveal="split">${splitWords(t.home.channelTitle)}</h2>
      </div>
      <div class="cta__side" data-reveal>
        <p>${t.home.channelText}</p>
        <a class="btn btn--primary btn--xl" href="${links.channel}" target="_blank" rel="noopener">
          ${icon('telegram', 'icon btn__lead')}<span>${t.home.channelCta}</span>${icon('arrow-up-right', 'icon btn__arrow')}
        </a>
      </div>
    </div>
  </section>`;
}

export function homePage(ctx) {
  const { t, brand, settings } = ctx;
  const products = listProducts({ brand: brand.key, visibleOnly: true });
  const slides = listSlides({ brand: brand.key, visibleOnly: true });

  let fresh = products.filter((item) => item.badge_new);
  if (fresh.length < 3) fresh = [...products].sort((a, b) => b.created_at - a.created_at).slice(0, 10);
  const hits = products.filter((item) => item.badge_hit);
  const featured = products.find((item) => item.featured) || null;

  // Bo'lim raqamlari (01, 02, ...) faqat haqiqatan chiqadigan bo'limlarga beriladi.
  let n = 0;
  const sections = [];
  if (products.length) {
    const freshList = fresh.slice(0, 12);
    sections.push(carousel(ctx, { id: 'yangi', label: t.home.newKicker, number: ++n, title: t.home.newTitle, products: freshList, moreHref: brand.catalog, eager: true }));
    if (ctx.categories.length) sections.push(categoryIndex(ctx, ++n, products));
    if (featured) sections.push(spotlight(ctx, featured, ++n));
    if (hits.length >= 2) {
      sections.push(carousel(ctx, { id: 'xit', label: t.home.hitKicker, number: ++n, title: t.home.hitTitle, products: hits.slice(0, 12), moreHref: brand.catalog }));
    } else {
      // Xit tovarlar bo'lmasa — katalogdan, lekin tepada ko'rsatilganlarni takrorlamasdan
      const shown = new Set(freshList.map((item) => item.id));
      const rest = products.filter((item) => !shown.has(item.id)).slice(0, 12);
      if (rest.length) sections.push(carousel(ctx, { label: t.home.allKicker, number: ++n, title: t.home.allTitle, products: rest, moreHref: brand.catalog }));
    }
    sections.push(manifesto(ctx, ++n));
  } else {
    sections.push(html`<section class="section empty"><div class="wrap">
      <h2 class="section__title">${t.home.emptyTitle}</h2>
      <p class="empty__text">${t.home.emptyText}</p>
    </div></section>`);
  }

  const title = (brand.key === 'fit' ? settings.seo_title_fit : settings.seo_title_lootbox) || `${brand.name} — ${t.brand[brand.key].line}`;
  const description = (brand.key === 'fit' ? settings.seo_desc_fit : settings.seo_desc_lootbox) || '';

  return page(ctx, {
    title,
    description,
    overlay: true,
    pageName: 'home',
    body: html`${hero(ctx, slides, products)}${marquee(ctx)}${sections}${otherBrandBand(ctx)}${channelBand(ctx)}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brand.name,
      url: ctx.origin + brand.home,
      sameAs: [ctx.links.uzum, ctx.links.channel, ctx.links.instagram, ctx.links.tiktok, ctx.links.youtube].filter(Boolean),
    },
  });
}
