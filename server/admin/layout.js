// Admin panel qobig'i: yon panel (telefonda suriladigan menyu), tepa qator,
// bildirishnomalar va tasdiqlash oynasi.
import { html, raw, attrs } from '../lib/html.js';
import { config } from '../config.js';
import { countProducts } from '../db/repo.js';
import { asset } from '../site/context.js';
import { wordmark } from '../site/brand.js';
import { ic } from './icons.js';

const NAV = [
  { key: 'home', href: '/admin', label: 'Bosh sahifa', icon: 'home' },
  { key: 'products', href: '/admin/products', label: 'Tovarlar', icon: 'box' },
  { key: 'categories', href: '/admin/categories', label: 'Kategoriyalar', icon: 'layers' },
  { key: 'slides', href: '/admin/slides', label: 'Hero slaydlar', icon: 'image' },
  { key: 'settings', href: '/admin/settings', label: 'Sozlamalar', icon: 'settings' },
];

function head({ title, csrf = '', sortable = false, scripts = [] }) {
  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0b0b0c">
${csrf ? html`<meta name="csrf-token" content="${csrf}">` : ''}
<title>${title} · LOOTBOX admin</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/static/vendor/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('shared/fonts.css')}">
<link rel="stylesheet" href="${asset('shared/art.css')}">
<link rel="stylesheet" href="${asset('admin/css/admin.css')}">
${sortable ? html`<script src="/static/vendor/sortable.min.js" defer></script>` : ''}
${scripts.map((name) => html`<script type="module" src="/static/admin/js/pages/${name}.js"></script>`)}`;
}

/**
 * Admin sahifasi.
 * @param {object} c Hono konteksti (ichida sessiya bor)
 * @param {{ title: string, active: string, body: any, actions?: any, back?: {href:string,label:string}|null,
 *   scripts?: string[], sortable?: boolean, wide?: boolean }} options
 */
export function shell(c, { title, active, body, actions = '', back = null, scripts = [], sortable = false, wide = false }) {
  const session = c.get('session');
  const total = countProducts().reduce((sum, row) => sum + row.total, 0);

  return String(html`<!doctype html>
<html lang="uz">
<head>
${head({ title, csrf: session?.csrf || '', sortable, scripts })}
</head>
<body class="adm" data-page="${active}">
<a class="skip" href="#main">Asosiy qismga o‘tish</a>

<aside class="side" id="side" data-side>
  <div class="side__head">
    <a class="side__brand" href="/admin" aria-label="LOOTBOX admin, bosh sahifa">
      ${wordmark('lootbox', { className: 'side__wm' })}
      <span class="side__tag">admin</span>
    </a>
    <button class="icon-btn side__close" type="button" data-side-close aria-label="Menyuni yopish">${ic('close')}</button>
  </div>
  <nav class="side__nav" aria-label="Bo‘limlar">
    ${NAV.map(
      (item) => html`<a${attrs({ class: `side__link${item.key === active ? ' is-active' : ''}`, href: item.href, 'aria-current': item.key === active ? 'page' : null })}>
        ${ic(item.icon)}<span>${item.label}</span>${item.key === 'products' && total ? html`<i class="side__count">${total}</i>` : ''}
      </a>`,
    )}
  </nav>
  <div class="side__foot">
    <a class="side__link" href="/" target="_blank" rel="noopener">${ic('external')}<span>Saytni ko‘rish</span></a>
    <button class="side__link side__logout" type="button" data-logout>${ic('logout')}<span>Chiqish</span></button>
  </div>
</aside>
<div class="scrim" data-side-close hidden></div>

<div class="main">
  <header class="top">
    <button class="icon-btn top__menu" type="button" data-side-open aria-label="Menyu" aria-controls="side" aria-expanded="false">${ic('menu')}</button>
    <div class="top__titles">
      ${back ? html`<a class="top__back" href="${back.href}">${ic('arrow-left')}<span>${back.label}</span></a>` : ''}
      <h1 class="top__title">${title}</h1>
    </div>
    ${actions ? html`<div class="top__actions">${actions}</div>` : ''}
  </header>
  <main class="content${wide ? ' content--wide' : ''}" id="main" tabindex="-1">
${body}
  </main>
</div>

<div class="toasts" data-toasts role="status" aria-live="polite"></div>

<dialog class="dialog dialog--confirm" data-confirm aria-labelledby="confirm-title">
  <form method="dialog" class="dialog__box">
    <span class="dialog__icon" data-confirm-icon>${ic('alert')}</span>
    <h2 class="dialog__title" id="confirm-title" data-confirm-title></h2>
    <p class="dialog__text" data-confirm-text></p>
    <div class="dialog__actions">
      <button class="btn btn--ghost" type="submit" value="cancel" data-confirm-cancel>Bekor qilish</button>
      <button class="btn btn--danger" type="submit" value="ok" data-confirm-ok>Ha</button>
    </div>
  </form>
</dialog>
${config.dev ? raw('<script src="/__dev/client.js"></script>') : ''}
</body>
</html>`);
}

/** Kirish sahifasi qobig'i (yon panelsiz) */
export function authShell({ title, body }) {
  return String(html`<!doctype html>
<html lang="uz">
<head>
${head({ title, scripts: ['login'] })}
</head>
<body class="adm adm--auth">
${body}
${config.dev ? raw('<script src="/__dev/client.js"></script>') : ''}
</body>
</html>`);
}
