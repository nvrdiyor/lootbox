// Tovarlar ro'yxati: brend bo'yicha bo'limlar, qidiruv va filtrlar (sahifa qayta yuklanmaydi),
// sudrab tartiblash, tezkor almashtirgichlar.
import { html, raw, attrs } from '../../lib/html.js';
import { productCode } from '../../lib/text.js';
import { listCategories } from '../../db/repo.js';
import { productsWithDestinations } from '../data.js';
import { ic, destIc } from '../icons.js';
import { shell } from '../layout.js';
import { BRAND_LABEL, DEST_SHORT, productThumb, priceText, switchOnly, emptyState } from '../ui.js';

const BRAND_KEYS = ['lootbox', 'fit'];

function row({ product, dest }) {
  const name = product.name;
  const onSite = product.visible && (!product.category || product.category.visible);
  const search = [name, product.slug, product.tagline, product.category?.name, productCode(product)].filter(Boolean).join(' ').toLowerCase();
  const flagButton = (field, on, label, extraClass = '', content = label) => html`<button${attrs({
    class: `flag${on ? ' is-on' : ''}${extraClass}`, type: 'button', 'data-patch': field, 'aria-pressed': on ? 'true' : 'false', title: label, 'aria-label': label,
  })}>${content}</button>`;

  return html`<li${attrs({
    class: `prow${product.visible ? '' : ' is-hidden'}`,
    'data-id': product.id,
    'data-brand': product.brand,
    'data-category': product.category_id ?? '',
    'data-visible': product.visible ? '1' : '0',
    'data-photo': product.images.length ? '1' : '0',
    'data-dest': dest ? dest.type : 'none',
    'data-search': search,
    'data-name': name,
  })}>
    <button class="prow__grip" type="button" data-grip aria-label="Tartibini o‘zgartirish: ${name}. Yuqoriga va pastga strelkalar bilan suring.">${ic('grip')}</button>
    <a class="prow__thumb" href="/admin/products/${product.id}" tabindex="-1" aria-hidden="true">${productThumb(product)}</a>
    <div class="prow__main">
      <a class="prow__name" href="/admin/products/${product.id}">${name}</a>
      <p class="prow__meta">
        <span>${product.category ? product.category.name : 'Kategoriyasiz'}</span>
        <span class="mono">${productCode(product)}</span>
        ${product.is_demo ? html`<span class="tag">demo</span>` : ''}
        ${product.category && !product.category.visible ? html`<span class="tag tag--warn">kategoriya yashirin</span>` : ''}
      </p>
    </div>
    <div class="prow__price">${priceText(product)}</div>
    <div class="prow__flags">
      ${flagButton('badge_new', product.badge_new, 'Yangi')}
      ${flagButton('badge_hit', product.badge_hit, 'Xit')}
      ${flagButton('featured', product.featured, 'Bosh sahifada tanlov', ' flag--star', ic('star'))}
    </div>
    <div class="prow__dest">
      ${dest
        ? html`<span class="dest dest--${dest.type}" title="${dest.url}">${ic(destIc(dest.type))}<span>${DEST_SHORT[dest.type]}</span></span>
            ${dest.fallback ? html`<span class="dest__note dest__note--warn" title="Tanlangan yo‘nalishda havola yo‘q, shuning uchun boshqasi ishlatilmoqda">${ic('alert')}</span>` : ''}
            ${product.dest_type === 'default' ? html`<span class="dest__note">standart</span>` : ''}`
        : html`<span class="dest dest--none" title="Bu tovarning tugmasi hech qayerga olib bormaydi">${ic('alert')}<span>Havola yo‘q</span></span>`}
    </div>
    <div class="prow__vis">${switchOnly({ checked: product.visible, label: 'Saytda ko‘rinadi', extra: { 'data-patch': 'visible' } })}</div>
    <div class="prow__actions">
      <a${attrs({ class: 'icon-btn', href: `/tovar/${product.slug}`, target: '_blank', rel: 'noopener', 'aria-label': `Saytda ko‘rish: ${name}`, title: 'Saytda ko‘rish', 'data-view': true, hidden: !onSite })}>${ic('external')}</a>
      <a class="icon-btn" href="/admin/products/${product.id}" aria-label="Tahrirlash: ${name}" title="Tahrirlash">${ic('edit')}</a>
      <button class="icon-btn" type="button" data-duplicate aria-label="Nusxa olish: ${name}" title="Nusxa olish">${ic('copy')}</button>
      <button class="icon-btn icon-btn--danger" type="button" data-delete aria-label="O‘chirish: ${name}" title="O‘chirish">${ic('trash')}</button>
    </div>
  </li>`;
}

export function productsPage(c) {
  const rows = productsWithDestinations();
  const categories = listCategories({});
  const byBrand = Object.fromEntries(BRAND_KEYS.map((brand) => [brand, rows.filter((item) => item.product.brand === brand)]));

  const body = rows.length
    ? html`
    <div class="toolbar" data-products>
      <div class="tabs" role="tablist" aria-label="Brend">
        <button class="tab is-active" type="button" role="tab" aria-selected="true" data-brand-tab="">Hammasi<i>${rows.length}</i></button>
        ${BRAND_KEYS.map((brand) => html`<button class="tab" type="button" role="tab" aria-selected="false" data-brand-tab="${brand}">${BRAND_LABEL[brand]}<i>${byBrand[brand].length}</i></button>`)}
      </div>
      <div class="toolbar__filters">
        <label class="search">
          ${ic('search')}
          <input type="search" placeholder="Nomi yoki kodi bo‘yicha qidirish" aria-label="Tovarlarni qidirish" data-filter-search autocomplete="off">
        </label>
        <div class="field__control field__control--select toolbar__select">
          <select class="input select" aria-label="Kategoriya" data-filter-category>
            <option value="">Barcha kategoriyalar</option>
            ${BRAND_KEYS.map((brand) => html`<optgroup label="${BRAND_LABEL[brand]}" data-brand="${brand}">
              ${categories.filter((cat) => cat.brand === brand).map((cat) => html`<option value="${cat.id}" data-brand="${brand}">${cat.name}</option>`)}
            </optgroup>`)}
            <option value="none">Kategoriyasiz</option>
          </select>
          ${ic('chevron-down', 'ic field__chev')}
        </div>
        <div class="field__control field__control--select toolbar__select">
          <select class="input select" aria-label="Holat" data-filter-state>
            <option value="">Barcha holatlar</option>
            <option value="visible">Saytda ko‘rinadigan</option>
            <option value="hidden">Yashirilgan</option>
            <option value="nophoto">Rasmsiz</option>
            <option value="nodest">Havolasiz</option>
            <option value="new">«Yangi» belgili</option>
            <option value="hit">«Xit» belgili</option>
          </select>
          ${ic('chevron-down', 'ic field__chev')}
        </div>
      </div>
    </div>

    <p class="list-note" data-list-note aria-live="polite"></p>

    ${BRAND_KEYS.map(
      (brand) => html`<section class="group" data-group="${brand}"${byBrand[brand].length ? '' : raw(' data-empty')}>
        <header class="group__head">
          <h2 class="group__title">${BRAND_LABEL[brand]}</h2>
          <span class="group__count" data-group-count>${byBrand[brand].length} ta</span>
          <a class="btn btn--ghost btn--sm" href="/admin/products/new?brand=${brand}">${ic('plus')}Qo‘shish</a>
        </header>
        <div class="rows">
          <div class="rows__head" aria-hidden="true">
            <span></span><span></span><span>Tovar</span><span>Narx</span><span>Belgilar</span><span>Tugma</span><span>Saytda</span><span></span>
          </div>
          <ul class="rows__list" role="list" data-sortable="${brand}">
            ${byBrand[brand].map(row)}
          </ul>
          <p class="rows__empty" data-group-empty hidden>Bu bo‘limda mos tovar topilmadi.</p>
        </div>
      </section>`,
    )}

    <div class="nomatch" data-nomatch hidden>
      ${emptyState({
        icon: 'search',
        title: 'Hech narsa topilmadi',
        text: 'Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring.',
        action: html`<button class="btn btn--ghost" type="button" data-filter-reset>Filtrlarni tozalash</button>`,
      })}
    </div>`
    : emptyState({
        icon: 'box',
        title: 'Hali tovar yo‘q',
        text: 'Birinchi tovarni qo‘shing: rasm, nom, narx va tugma havolasi. U darhol saytda ko‘rinadi.',
        action: html`<a class="btn btn--primary" href="/admin/products/new">${ic('plus')}<span>Tovar qo‘shish</span></a>`,
      });

  return shell(c, {
    title: 'Tovarlar',
    active: 'products',
    scripts: ['products'],
    sortable: true,
    wide: true,
    actions: html`<a class="btn btn--primary" href="/admin/products/new">${ic('plus')}<span>Tovar qo‘shish</span></a>`,
    body,
  });
}
