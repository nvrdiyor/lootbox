// Faqat dev rejimida: barcha chizmalarni bitta sahifada ko'rish — /__dev/art  va  /__dev/art?b=fit
import { html } from '../lib/html.js';
import { ART_OPTIONS, artSvg, TONES, toneStyle } from '../site/art.js';
import { makeContext } from '../site/context.js';
import { page } from '../site/layout.js';

export function mountArtPreview(app) {
  app.get('/__dev/art', (c) => {
    const brand = c.req.query('b') === 'fit' ? 'fit' : 'lootbox';
    const ctx = makeContext(c, brand);
    const tones = TONES[brand];
    const body = html`<section class="wrap" style="padding-block:40px">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px">
        ${ART_OPTIONS.map(
          (option, i) => html`<figure style="margin:0">
            <div class="card__media art" style="${toneStyle(tones[i % tones.length])}"><div class="card__art">${artSvg(option.key)}</div></div>
            <figcaption style="font:600 .78rem var(--font-mono);padding-top:8px">${option.key} · ${option.label}</figcaption>
          </figure>`,
        )}
      </div>
    </section>`;
    return c.html(page(ctx, { title: 'Chizmalar', body }));
  });
}
