import { html } from '../../lib/html.js';
import { icon } from '../icons.js';
import { page } from '../layout.js';

export function notFoundPage(ctx) {
  const { t, brand } = ctx;
  return page(ctx, {
    title: `${t.notFound.title} — ${brand.name}`,
    pageName: 'lost',
    noindex: true,
    body: html`<section class="lost">
      <div class="wrap">
        <p class="lost__code" aria-hidden="true">404</p>
        <h1 class="lost__title">${t.notFound.title}</h1>
        <p class="lost__text">${t.notFound.text}</p>
        <div class="lost__actions">
          <a class="btn btn--primary btn--xl" href="${brand.home}"><span>${t.notFound.home}</span>${icon('arrow-right', 'icon btn__arrow')}</a>
          <a class="btn btn--ghost btn--xl" href="${brand.catalog}"><span>${t.notFound.catalog}</span></a>
        </div>
      </div>
    </section>`,
  });
}
