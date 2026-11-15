// Faqat dev rejimida: ijtimoiy tarmoq / Telegram uchun 1200×630 muqova sahifasi.
// `npm run og` shu sahifani Chrome bilan suratga olib, public/brand/og-*.png ga yozadi.
import { html } from '../lib/html.js';
import { dictionary } from '../i18n/index.js';
import { asset } from '../site/context.js';
import { wordmark } from '../site/brand.js';
import { artSvg, toneFor, toneStyle } from '../site/art.js';

export function mountOgPreview(app) {
  app.get('/__dev/og', (c) => {
    const fit = c.req.query('b') === 'fit';
    const brand = fit ? 'fit' : 'lootbox';
    const t = dictionary();
    const tone = toneFor(brand, 1, fit ? 'sand' : 'volt');
    return c.html(
      String(html`<!doctype html>
<html lang="uz" data-brand="${brand}">
<head>
<meta charset="utf-8">
<title>OG — ${brand}</title>
<link rel="stylesheet" href="${asset('shared/fonts.css')}">
<link rel="stylesheet" href="${asset('shared/art.css')}">
<link rel="stylesheet" href="${asset('site/css/site.css')}">
<style>
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  .og { position: relative; width: 1200px; height: 630px; display: grid; grid-template-columns: 1fr 470px; align-items: center; padding: 0 0 0 76px; background: var(--bg); overflow: hidden; }
  .og__grid { position: absolute; inset: 0; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 70px 70px; mask-image: radial-gradient(90% 90% at 78% 50%, #000, transparent 75%); }
  .og__glow { position: absolute; right: -180px; top: 50%; width: 900px; height: 900px; translate: 0 -50%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in oklab, var(--tone) 32%, transparent), transparent 72%); }
  .og__body { position: relative; }
  .og__wm { width: ${fit ? '640px' : '560px'}; height: auto; }
  .og__line { margin-top: 34px; font: 700 34px/1.2 var(--font-display); letter-spacing: -.03em; max-width: 13em; }
  .og__meta { margin-top: 26px; font: 600 18px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--text-2); }
  .og__art { --art-bg: var(--bg); position: relative; width: 400px; height: 400px; display: grid; place-items: center; background: none; }
  .og__ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed color-mix(in oklab, var(--tone) 60%, transparent); }
  .og__ring--b { inset: 54px; border: 1.5px solid var(--line-2); }
  .og__art .art__svg { width: 58%; stroke-width: 2.6; filter: drop-shadow(0 0 40px color-mix(in oklab, var(--tone) 45%, transparent)); }
</style>
</head>
<body>
<div class="og" style="${toneStyle(tone)}">
  <div class="og__grid"></div>
  <div class="og__glow"></div>
  <div class="og__body">
    ${wordmark(fit ? 'full' : 'lootbox', { className: 'og__wm' })}
    <p class="og__line">${t.brand[brand].line}</p>
    <p class="og__meta">Uzum Market · Telegram</p>
  </div>
  <div class="og__art art">
    <div class="og__ring"></div>
    <div class="og__ring og__ring--b"></div>
    ${artSvg(fit ? 'hoodie' : 'box')}
  </div>
</div>
</body>
</html>`),
    );
  });
}
