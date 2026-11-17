// Kategoriyalar: har brend uchun alohida ro'yxat, sudrab tartiblash, oynada tahrirlash.
import { html, raw, attrs, jsonScript } from '../../lib/html.js';
import { listCategories, listProducts, getSettings } from '../../db/repo.js';
import { dictionary } from '../../i18n/index.js';
import { brandOf } from '../../site/brand.js';
import { categorySeo } from '../../site/seo.js';
import { artSvg, toneFor, toneStyle } from '../../site/art.js';
import { LIMITS } from '../validate.js';
import { ic } from '../icons.js';
import { shell } from '../layout.js';
import { field, textarea, switchRow, segmented, glyphPicker, uploader, switchOnly, BRAND_LABEL } from '../ui.js';

const BRAND_KEYS = ['lootbox', 'fit'];

function row(cat) {
  const tone = toneFor(cat.brand, cat.id);
  return html`<li${attrs({ class: `crow${cat.visible ? '' : ' is-hidden'}`, 'data-id': cat.id, 'data-name': cat.name })}>
    <button class="prow__grip" type="button" data-grip aria-label="Tartibini o‘zgartirish: ${cat.name}. Yuqoriga va pastga strelkalar bilan suring.">${ic('grip')}</button>
    <span class="pthumb pthumb--square art${cat.image ? ' has-photo' : ''}" style="${toneStyle(tone)}">${cat.image
      ? html`<img src="${cat.image.thumb_url}" alt="" loading="lazy" width="${cat.image.width}" height="${cat.image.height}">`
      : artSvg(cat.art)}</span>
    <div class="crow__main">
      <button class="crow__name" type="button" data-edit>${cat.name}</button>
      <p class="prow__meta">
        <span class="mono">/${cat.slug}</span>
        ${cat.tagline ? html`<span>${cat.tagline}</span>` : ''}
        ${cat.is_demo ? html`<span class="tag">demo</span>` : ''}
      </p>
    </div>
    <a class="crow__count" href="/admin/products?brand=${cat.brand}&category=${cat.id}" title="Shu kategoriyadagi tovarlar">${cat.product_total} ta tovar</a>
    <div class="prow__vis">${switchOnly({ checked: cat.visible, label: 'Saytda ko‘rinadi', extra: { 'data-patch': 'visible' } })}</div>
    <div class="prow__actions">
      <button class="icon-btn" type="button" data-edit aria-label="Tahrirlash: ${cat.name}" title="Tahrirlash">${ic('edit')}</button>
      <button class="icon-btn icon-btn--danger" type="button" data-delete aria-label="O‘chirish: ${cat.name}" title="O‘chirish">${ic('trash')}</button>
    </div>
  </li>`;
}

export function categoriesPage(c) {
  const categories = listCategories({});
  // Qidiruv tizimlari uchun avtomatik matnlar (admin yozmasa sayt shularni ishlatadi) — oynada kulrang matn bo'lib turadi
  const settings = getSettings();
  const t = dictionary();
  const autoSeo = (cat) =>
    categorySeo(
      { t, brand: brandOf(cat.brand), settings, showPrices: settings.show_prices !== '0' },
      cat,
      listProducts({ brand: cat.brand, categoryId: cat.id, visibleOnly: true }),
    ).auto;

  const body = html`
    <p class="lead">Kategoriyalar saytning menyusida, katalogda va bosh sahifadagi ro‘yxatda chiqadi. Ichida ko‘rinadigan tovari bo‘lmagan kategoriya saytda ko‘rsatilmaydi.</p>

    ${BRAND_KEYS.map((brand) => {
      const list = categories.filter((cat) => cat.brand === brand);
      return html`<section class="group" data-group="${brand}">
        <header class="group__head">
          <h2 class="group__title">${BRAND_LABEL[brand]}</h2>
          <span class="group__count">${list.length} ta</span>
          <button class="btn btn--ghost btn--sm" type="button" data-new="${brand}">${ic('plus')}Kategoriya qo‘shish</button>
        </header>
        <div class="rows">
          <ul class="rows__list" role="list" data-sortable="${brand}">${list.map(row)}</ul>
          ${list.length ? '' : html`<p class="rows__empty">Bu brendda hali kategoriya yo‘q.</p>`}
        </div>
      </section>`;
    })}

    <dialog class="dialog dialog--sheet" data-category-dialog aria-labelledby="category-dialog-title">
      <form class="sheet" data-category-form novalidate autocomplete="off">
        <header class="sheet__head">
          <h2 class="sheet__title" id="category-dialog-title" data-dialog-title>Kategoriya</h2>
          <button class="icon-btn" type="button" data-dialog-close aria-label="Yopish">${ic('close')}</button>
        </header>
        <div class="sheet__body stack">
          ${segmented({ name: 'brand', value: 'lootbox', label: 'Brend', className: 'seg--full', options: BRAND_KEYS.map((brand) => ({ value: brand, label: BRAND_LABEL[brand] })) })}
          ${field({ name: 'name', label: 'Nomi', required: true, maxlength: LIMITS.categoryName, placeholder: 'Masalan: Gilamchalar' })}
          ${field({ name: 'tagline', label: 'Qisqa izoh', maxlength: LIMITS.categoryTagline, placeholder: 'Bir jumla: bu kategoriyada nima bor', hint: 'Bosh sahifadagi ro‘yxatda va katalog sarlavhasi ostida chiqadi.' })}
          <div class="field" data-field="slug">
            <label class="field__label" for="f-cat-slug">Havola nomi</label>
            <div class="field__control has-prefix">
              <span class="field__prefix" data-slug-prefix>/katalog/</span>
              <input class="input input--mono" id="f-cat-slug" name="slug" type="text" maxlength="80" spellcheck="false" placeholder="nomidan-yasaladi">
            </div>
            <p class="field__hint">Bo‘sh qoldirsangiz, nomdan o‘zi yasaladi.</p>
            <p class="field__error" data-error hidden></p>
          </div>
          <details class="more" data-seo-details>
            <summary>Qidiruv tizimlari (SEO)</summary>
            <div class="stack">
              <p class="note"><span>Google va Yandex’da kategoriya qanday chiqishi. Bo‘sh qoldirsangiz, sayt o‘zi tuzadi — maydonlardagi kulrang matn shuni ko‘rsatadi.</span></p>
              ${field({ name: 'search_terms', label: 'Qidiruv so‘zlari', maxlength: LIMITS.searchTerms, placeholder: 'kovrik, mousepad, коврик для мыши', hint: `Odamlar shu turdagi tovarni qanday nomlar bilan qidiradi: vergul bilan, eng ko‘p ishlatiladigani birinchi. Eng ko‘pi ${LIMITS.searchTermCount} ta. Kategoriya va undagi tovarlar sahifasida «Boshqa nomlari» qatorida ko‘rinadi.` })}
              ${textarea({ name: 'intro', label: 'Kirish matni', rows: 4, maxlength: LIMITS.categoryIntro, counter: true, hint: 'Kategoriya sahifasida sarlavha ostida chiqadi: bu nima va kimga kerak — 2–3 jumla.' })}
              ${field({ name: 'meta_title', label: 'Sahifa sarlavhasi', maxlength: LIMITS.metaTitle, hint: 'Qidiruv natijasidagi ko‘k sarlavha. Taxminan 60 belgigacha to‘liq ko‘rinadi.' })}
              ${textarea({ name: 'meta_description', label: 'Sahifa tavsifi', rows: 3, maxlength: LIMITS.metaDescription, counter: true, hint: 'Qidiruv natijasida sarlavha ostidagi matn. Taxminan 160 belgigacha to‘liq ko‘rinadi.' })}
            </div>
          </details>
          ${glyphPicker({ name: 'art', value: 'box', label: 'Belgi', hint: 'Rasmi yo‘q tovarlar va kategoriya kartochkasi uchun chizma.' })}
          <div class="field" data-field="image_id">
            <span class="field__label">Muqova rasmi (ixtiyoriy)</span>
            ${uploader({ id: 'category-image', note: 'Bosh sahifadagi ro‘yxatda chizma o‘rniga chiqadi.' })}
            <p class="field__error" data-error hidden></p>
          </div>
          <div class="switches">
            ${switchRow({ name: 'visible', checked: true, label: 'Saytda ko‘rinadi', hint: 'O‘chirilsa, kategoriya va undagi tovarlar saytdan yashiriladi.' })}
          </div>
        </div>
        <footer class="sheet__foot">
          <button class="btn btn--ghost" type="button" data-dialog-close>Bekor qilish</button>
          <button class="btn btn--primary" type="submit" data-save>${ic('check')}<span>Saqlash</span></button>
        </footer>
      </form>
    </dialog>

    <script type="application/json" id="page-data">${jsonScript({
      categories: categories.map((cat) => ({
        id: cat.id, brand: cat.brand, name: cat.name, slug: cat.slug, tagline: cat.tagline, art: cat.art,
        visible: cat.visible, image: cat.image, product_total: cat.product_total,
        search_terms: cat.search_terms, meta_title: cat.meta_title, meta_description: cat.meta_description, intro: cat.intro,
        auto: autoSeo(cat),
      })),
    })}</script>`;

  return shell(c, {
    title: 'Kategoriyalar',
    active: 'categories',
    scripts: ['categories'],
    sortable: true,
    actions: html`<button class="btn btn--primary" type="button" data-new="lootbox">${ic('plus')}<span>Kategoriya qo‘shish</span></button>`,
    body: raw(String(body)),
  });
}
