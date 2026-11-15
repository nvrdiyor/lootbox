// Sahifa qobig'i: <head>, tepadagi panel (LOOTBOX | LOOTBOX FIT almashtirgichi bilan),
// mobil menyu va footer.
import fs from 'node:fs';
import path from 'node:path';
import { html, raw, attrs, jsonScript } from '../lib/html.js';
import { config } from '../config.js';
import { BRANDS, wordmark, boxMark, customLogo } from './brand.js';
import { icon } from './icons.js';
import { asset, categoryUrl } from './context.js';

const two = (n) => String(n).padStart(2, '0');

/** Brend logotipi: egasi public/brand/ ga o'z faylini qo'ygan bo'lsa o'sha, bo'lmasa chizilgan so'z-logotip. */
export function logo(brandKey, part, className) {
  const custom = customLogo(brandKey);
  if (custom) return html`<img class="${className} wm-img" src="${custom}" alt="">`;
  return wordmark(part, { className });
}

/** LOOTBOX | LOOTBOX FIT — tepadagi bo'lim almashtirgichi */
function brandSwitch(ctx) {
  const active = ctx.brand.key;
  const item = (key) => {
    const brand = BRANDS[key];
    const isActive = key === active;
    const current = isActive ? (ctx.path === brand.home ? 'page' : 'true') : null;
    const inner =
      key === 'fit'
        ? html`${logo('fit', 'full', 'switch__wm switch__wm--wide')}${logo('fit', 'fit', 'switch__wm switch__wm--narrow')}`
        : logo('lootbox', 'lootbox', 'switch__wm');
    return html`<a${attrs({
      class: `switch__item${isActive ? ' is-active' : ''}`,
      href: brand.home,
      'aria-current': current,
      'aria-label': brand.name,
      'data-brand-link': key,
    })}>${inner}</a>`;
  };
  return html`<nav class="switch" aria-label="${ctx.t.footer.brands}">
    ${item('lootbox')}<span class="switch__sep" aria-hidden="true"></span>${item('fit')}
  </nav>`;
}

function header(ctx) {
  const { t, brand, categories, links } = ctx;
  return html`<header class="header" data-header>
    <div class="header__inner wrap">
      ${brandSwitch(ctx)}
      <nav class="nav" aria-label="${t.nav.menu}">
        <a class="nav__link" href="${brand.catalog}"${ctx.path === brand.catalog ? raw(' aria-current="page"') : ''}>${t.nav.catalog}</a>
        ${categories.length
          ? html`<div class="nav__drop" data-drop>
              <button class="nav__link" type="button" aria-expanded="false" aria-controls="nav-categories" data-drop-toggle>
                ${t.nav.categories}${icon('chevron-down', 'icon nav__chev')}
              </button>
              <div class="nav__panel" id="nav-categories" data-drop-panel>
                <ul role="list">
                  ${categories.map(
                    (cat, i) => html`<li><a class="nav__cat" href="${categoryUrl(brand.key, cat)}">
                      <span class="nav__cat-n">${two(i + 1)}</span>
                      <span class="nav__cat-name">${ctx.tr(cat, 'name')}</span>
                      <span class="nav__cat-count">${cat.product_count}</span>
                    </a></li>`,
                  )}
                </ul>
              </div>
            </div>`
          : ''}
      </nav>
      <div class="header__actions">
        ${links.channel
          ? html`<a class="round round--ghost header__tg" href="${links.channel}" target="_blank" rel="noopener" aria-label="${t.footer.channel}">${icon('telegram')}</a>`
          : ''}
        ${links.uzum
          ? html`<a class="pill header__shop" href="${links.uzum}" target="_blank" rel="noopener"><span>${t.footer.uzumShop}</span>${icon('arrow-up-right')}</a>`
          : ''}
        <button class="burger" type="button" aria-label="${t.nav.menu}" aria-expanded="false" aria-controls="menu" data-menu-toggle>
          <span></span><span></span>
        </button>
      </div>
    </div>
  </header>`;
}

function mobileMenu(ctx) {
  const { t, brand, categories, links } = ctx;
  const other = BRANDS[brand.other];
  return html`<div class="menu" id="menu" data-menu aria-hidden="true" inert>
    <div class="menu__inner wrap">
      <nav class="menu__nav" aria-label="${t.nav.menu}">
        <a class="menu__link" href="${brand.catalog}" style="--i:0"><span class="menu__n">01</span><span>${t.nav.catalog}</span></a>
        ${categories.map(
          (cat, i) => html`<a class="menu__link menu__link--sub" href="${categoryUrl(brand.key, cat)}" style="--i:${i + 1}">
            <span class="menu__n">${two(i + 2)}</span><span>${ctx.tr(cat, 'name')}</span><i>${cat.product_count}</i>
          </a>`,
        )}
      </nav>
      <a class="menu__other" href="${other.home}" data-brand="${other.key}" data-brand-link="${other.key}" style="--i:${categories.length + 1}">
        <span class="menu__other-label">${t.nav.switchTo}</span>
        ${logo(other.key, other.key === 'fit' ? 'full' : 'lootbox', 'menu__other-wm')}
        ${icon('arrow-right')}
      </a>
      <div class="menu__foot" style="--i:${categories.length + 2}">
        ${links.uzum ? html`<a href="${links.uzum}" target="_blank" rel="noopener">${t.footer.uzumShop}${icon('arrow-up-right')}</a>` : ''}
        ${links.channel ? html`<a href="${links.channel}" target="_blank" rel="noopener">${t.footer.channel}${icon('arrow-up-right')}</a>` : ''}
        ${links.dm ? html`<a href="${links.dm}" target="_blank" rel="noopener">${t.footer.dm}${icon('arrow-up-right')}</a>` : ''}
      </div>
    </div>
  </div>`;
}

function footer(ctx) {
  const { t, brand, categories, links, settings } = ctx;
  const about = brand.key === 'fit' ? settings.about_fit : settings.about_lootbox;
  const contact = [
    links.uzum && [links.uzum, t.footer.uzumShop],
    links.channel && [links.channel, t.footer.channel],
    links.dm && [links.dm, t.footer.dm],
    links.instagram && [links.instagram, t.footer.instagram],
    links.tiktok && [links.tiktok, t.footer.tiktok],
    links.youtube && [links.youtube, t.footer.youtube],
  ].filter(Boolean);
  const year = new Date().getFullYear();
  return html`<footer class="footer" id="aloqa">
    <div class="wrap footer__grid">
      <div class="footer__about" data-reveal>
        ${boxMark('mark footer__box')}
        <p class="footer__line">${t.brand[brand.key].line}</p>
        ${about ? html`<p class="footer__text">${about}</p>` : ''}
      </div>
      <nav class="footer__col" aria-label="${t.footer.brands}" data-reveal style="--d:60">
        <h2 class="footer__h">${t.footer.brands}</h2>
        <ul role="list">
          ${Object.values(BRANDS).map(
            (item) => html`<li><a href="${item.home}" data-brand-link="${item.key}"${item.key === brand.key ? raw(' aria-current="true"') : ''}>${item.name}</a></li>`,
          )}
        </ul>
      </nav>
      <nav class="footer__col" aria-label="${t.footer.catalog}" data-reveal style="--d:120">
        <h2 class="footer__h">${t.footer.catalog}</h2>
        <ul role="list">
          <li><a href="${brand.catalog}">${t.nav.allProducts}</a></li>
          ${categories.map((cat) => html`<li><a href="${categoryUrl(brand.key, cat)}">${ctx.tr(cat, 'name')}</a></li>`)}
        </ul>
      </nav>
      ${contact.length
        ? html`<nav class="footer__col" aria-label="${t.footer.contact}" data-reveal style="--d:180">
            <h2 class="footer__h">${t.footer.contact}</h2>
            <ul role="list">
              ${contact.map(([href, label]) => html`<li><a href="${href}" target="_blank" rel="noopener">${label}${icon('arrow-up-right')}</a></li>`)}
            </ul>
          </nav>`
        : ''}
    </div>
    <div class="footer__mark" aria-hidden="true" data-reveal="letters">
      ${logo(brand.key, brand.key === 'fit' ? 'full' : 'lootbox', 'footer__wm')}
    </div>
    <div class="wrap footer__bottom">
      <p>© ${year} ${brand.name}. ${t.footer.rights}</p>
      <a class="footer__top" href="#top">${t.footer.top}${icon('arrow-up')}</a>
    </div>
  </footer>`;
}

const brandFiles = new Map();
function brandFileExists(name) {
  if (!brandFiles.has(name) || config.dev) {
    brandFiles.set(name, fs.existsSync(path.join(config.publicDir, 'brand', name)));
  }
  return brandFiles.get(name);
}

/**
 * To'liq HTML sahifa.
 * @param {object} ctx makeContext() natijasi
 * @param {{ title: string, description?: string, body: any, overlay?: boolean,
 *   ogImage?: string|null, ogType?: string, canonical?: string, jsonLd?: object|null, pageName?: string }} options
 */
export function page(ctx, { title, description = '', body, overlay = false, ogImage = null, ogType = 'website', canonical = null, jsonLd = null, pageName = '', adminLink = null }) {
  const { t, brand } = ctx;
  const canonicalUrl = ctx.origin + (canonical || ctx.path);
  const fallbackOg = `og-${brand.key}.png`;
  const image = ogImage || (brandFileExists(fallbackOg) ? `/static/brand/${fallbackOg}` : null);
  const imageUrl = image ? (image.startsWith('http') ? image : ctx.origin + image) : null;

  return String(html`<!doctype html>
<html lang="${t.lang}" data-brand="${brand.key}" data-page="${pageName}" data-motion="${ctx.settings.motion === 'auto' ? 'auto' : 'full'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${description ? html`<meta name="description" content="${description}">` : ''}
<link rel="canonical" href="${canonicalUrl}">
<meta name="theme-color" content="${brand.themeColor}">
<meta property="og:site_name" content="${brand.name}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${title}">
${description ? html`<meta property="og:description" content="${description}">` : ''}
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:locale" content="uz_UZ">
${imageUrl ? html`<meta property="og:image" content="${imageUrl}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="/favicon.svg${brand.key === 'fit' ? '?b=fit' : ''}" type="image/svg+xml">
<link rel="preload" href="/static/vendor/fonts/unbounded-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/static/vendor/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('shared/fonts.css')}">
<link rel="stylesheet" href="${asset('shared/art.css')}">
<link rel="stylesheet" href="${asset('site/css/site.css')}">
<script src="${asset('site/js/boot.js')}"></script>
<script type="module" src="${asset('site/js/app.js')}"></script>
${jsonLd ? html`<script type="application/ld+json">${jsonScript(jsonLd)}</script>` : ''}
</head>
<body class="${overlay ? 'has-overlay-header' : ''}">
<a class="skip" href="#main">${t.nav.skip}</a>
<div id="top"></div>
${header(ctx)}
${mobileMenu(ctx)}
<main id="main" tabindex="-1">
${body}
</main>
${footer(ctx)}
${ctx.isAdmin
    ? html`<a class="adminpill" href="${adminLink?.href || '/admin'}">${icon('edit')}<span>${adminLink?.label || t.admin.panel}</span></a>`
    : ''}
<div class="cursor" data-cursor-el aria-hidden="true"><span>${t.cursor.drag}</span></div>
${ctx.dev ? html`<script src="/__dev/client.js"></script>` : ''}
</body>
</html>`);
}
