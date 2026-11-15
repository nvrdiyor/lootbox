// Hero slaydlar: bosh sahifaning eng tepasidagi katta almashinuvchi bloklar.
import { html, raw, attrs, jsonScript } from '../../lib/html.js';
import { listSlides, listCategories, listProducts } from '../../db/repo.js';
import { artSvg, toneFor, toneStyle, TONES } from '../../site/art.js';
import { slidePhotos } from '../../site/slide-photos.js';
import { LIMITS } from '../validate.js';
import { ic } from '../icons.js';
import { shell } from '../layout.js';
import { field, textarea, select, switchRow, segmented, glyphPicker, tonePicker, uploader, switchOnly, BRAND_LABEL } from '../ui.js';

const BRAND_KEYS = ['lootbox', 'fit'];

function targetLabel(slide, categories, products) {
  if (slide.link_type === 'category') {
    const cat = categories.find((item) => String(item.id) === String(slide.link_value));
    return cat ? `Kategoriya: ${cat.name}` : 'Katalog (kategoriya topilmadi)';
  }
  if (slide.link_type === 'product') {
    const product = products.find((item) => String(item.id) === String(slide.link_value));
    return product ? `Tovar: ${product.name}` : 'Katalog (tovar topilmadi)';
  }
  if (slide.link_type === 'url') return `Havola: ${slide.link_value}`;
  return 'Katalog';
}

function row(slide, categories, products, visibleProducts) {
  const tone = toneFor(slide.brand, slide.id, slide.tone);
  // Rasm yuklanmagan slayd saytda bog'langan tovar yoki kategoriya rasmlarini ko'rsatadi
  const linked = slide.image ? null : slidePhotos(slide, visibleProducts.filter((item) => item.brand === slide.brand), 1)[0] || null;
  const photo = slide.image || linked;
  return html`<li${attrs({ class: `srow${slide.visible ? '' : ' is-hidden'}`, 'data-id': slide.id, 'data-name': slide.title })}>
    <button class="prow__grip" type="button" data-grip aria-label="Tartibini o‘zgartirish: ${slide.title}. Yuqoriga va pastga strelkalar bilan suring.">${ic('grip')}</button>
    <span class="pthumb pthumb--wide art${photo ? (photo.cutout ? ' has-cutout' : ' has-photo') : ''}" style="${toneStyle(tone)}">${photo
      ? html`<img${photo.cutout ? raw(' class="is-cutout"') : ''} src="${photo.thumb_url}" alt="" loading="lazy" width="${photo.width}" height="${photo.height}">`
      : artSvg(slide.art)}</span>
    <div class="crow__main">
      <button class="crow__name" type="button" data-edit>${slide.title}</button>
      <p class="prow__meta">
        ${slide.kicker ? html`<span>${slide.kicker}</span>` : ''}
        <span>${targetLabel(slide, categories, products)}</span>
        <span>${slide.image ? 'Rasm: butun ekran' : linked ? 'Rasm: tovar rasmlari (3D)' : 'Rasm yo‘q: chizma'}</span>
        ${slide.is_demo ? html`<span class="tag">demo</span>` : ''}
      </p>
    </div>
    <div class="prow__vis">${switchOnly({ checked: slide.visible, label: 'Saytda ko‘rinadi', extra: { 'data-patch': 'visible' } })}</div>
    <div class="prow__actions">
      <button class="icon-btn" type="button" data-edit aria-label="Tahrirlash: ${slide.title}" title="Tahrirlash">${ic('edit')}</button>
      <button class="icon-btn icon-btn--danger" type="button" data-delete aria-label="O‘chirish: ${slide.title}" title="O‘chirish">${ic('trash')}</button>
    </div>
  </li>`;
}

export function slidesPage(c) {
  const slides = listSlides({});
  const categories = listCategories({});
  const products = listProducts({});
  // Saytda ko'rinadigan tovarlar: rasm yuklanmagan slayd shularning rasmlarini oladi.
  // covers — oynadagi jonli ko'rinish uchun: tovar, kategoriya va bo'lim bo'yicha birinchi muqova.
  const visibleProducts = listProducts({ visibleOnly: true });
  const covers = { product: {}, category: {}, brand: {} };
  for (const item of visibleProducts) {
    const cover = item.images[0];
    if (!cover) continue;
    covers.product[item.id] = cover.thumb_url;
    if (item.category_id) covers.category[item.category_id] ??= cover.thumb_url;
    covers.brand[item.brand] ??= cover.thumb_url;
  }

  const categoryOptions = [
    { value: '', label: 'Kategoriyani tanlang' },
    ...BRAND_KEYS.map((brand) => ({
      group: BRAND_LABEL[brand],
      options: categories.filter((cat) => cat.brand === brand).map((cat) => ({ value: cat.id, label: cat.name, data: { 'data-brand': brand } })),
    })),
  ];
  const productOptions = [
    { value: '', label: 'Tovarni tanlang' },
    ...BRAND_KEYS.map((brand) => ({
      group: BRAND_LABEL[brand],
      options: products.filter((item) => item.brand === brand).map((item) => ({ value: item.id, label: item.name, data: { 'data-brand': brand } })),
    })),
  ];

  const body = html`
    <p class="lead">Slaydlar bosh sahifaning eng tepasida navbat bilan almashadi. Rasm yuklansa, u butun ekranni egallaydi. Yuklanmasa, slayd bog‘langan tovar yoki kategoriyaning rasmlari 3D to‘plam bo‘lib chiqadi; ularda ham rasm bo‘lmasa — tanlangan chizma.</p>

    ${BRAND_KEYS.map((brand) => {
      const list = slides.filter((slide) => slide.brand === brand);
      return html`<section class="group" data-group="${brand}">
        <header class="group__head">
          <h2 class="group__title">${BRAND_LABEL[brand]}</h2>
          <span class="group__count">${list.length} ta</span>
          <button class="btn btn--ghost btn--sm" type="button" data-new="${brand}">${ic('plus')}Slayd qo‘shish</button>
        </header>
        <div class="rows">
          <ul class="rows__list" role="list" data-sortable="${brand}">${list.map((slide) => row(slide, categories, products, visibleProducts))}</ul>
          ${list.length ? '' : html`<p class="rows__empty">Slayd yo‘q. Bosh sahifada brend nomi yozilgan oddiy blok ko‘rinadi.</p>`}
        </div>
      </section>`;
    })}

    <dialog class="dialog dialog--sheet dialog--wide" data-slide-dialog aria-labelledby="slide-dialog-title">
      <form class="sheet" data-slide-form novalidate autocomplete="off">
        <header class="sheet__head">
          <h2 class="sheet__title" id="slide-dialog-title" data-dialog-title>Slayd</h2>
          <button class="icon-btn" type="button" data-dialog-close aria-label="Yopish">${ic('close')}</button>
        </header>
        <div class="sheet__body sheet__body--split">
          <div class="stack">
            ${segmented({ name: 'brand', value: 'lootbox', label: 'Brend', className: 'seg--full', options: BRAND_KEYS.map((brand) => ({ value: brand, label: BRAND_LABEL[brand] })) })}
            ${field({ name: 'kicker', label: 'Kichik sarlavha', maxlength: LIMITS.slideKicker, placeholder: 'Masalan: Yangi kelgan' })}
            ${textarea({ name: 'title', label: 'Sarlavha', rows: 2, maxlength: LIMITS.slideTitle, counter: true, placeholder: 'Masalan: Silliq sirpanish. Aniq nishon.' })}
            ${textarea({ name: 'subtitle', label: 'Matn', rows: 3, maxlength: LIMITS.slideSubtitle, counter: true, placeholder: 'Bir-ikki jumla: taklif nima haqida' })}
            ${field({ name: 'cta_label', label: 'Tugma matni', maxlength: LIMITS.slideCta, placeholder: 'Masalan: Ko‘rish' })}
            ${segmented({
              name: 'link_type',
              value: 'catalog',
              label: 'Tugma qayerga olib boradi',
              className: 'seg--wrap',
              options: [
                { value: 'catalog', label: 'Katalog' },
                { value: 'category', label: 'Kategoriya' },
                { value: 'product', label: 'Tovar' },
                { value: 'url', label: 'O‘z havolam' },
              ],
            })}
            <div data-link-panel="category" hidden>${select({ name: 'link_category', label: 'Kategoriya', options: categoryOptions })}</div>
            <div data-link-panel="product" hidden>${select({ name: 'link_product', label: 'Tovar', options: productOptions })}</div>
            <div data-link-panel="url" hidden>${field({ name: 'link_url', label: 'Havola', mono: true, placeholder: '/katalog yoki https://t.me/kanal', hint: 'Sayt ichidagi manzil (/ bilan boshlanadi) yoki to‘liq havola.' })}</div>
            <p class="field__error" data-link-error hidden></p>
            <div class="field" data-field="image_id">
              <span class="field__label">Rasm (ixtiyoriy)</span>
              ${uploader({ id: 'slide-image', note: 'Gorizontal rasm, kamida 1920 px eni.' })}
              <p class="field__hint">Yuklangan rasm butun ekranga fon bo‘ladi. Yuklamasangiz, tepada tanlangan tovar yoki kategoriyaning rasmlari 3D to‘plam bo‘lib chiqadi.</p>
              <p class="field__error" data-error hidden></p>
            </div>
            ${glyphPicker({ name: 'art', value: 'box', label: 'Chizma (hech qanday rasm bo‘lmasa)' })}
            ${tonePicker({ name: 'tone', value: '', label: 'Chizma rangi' })}
            <div class="switches">
              ${switchRow({ name: 'visible', checked: true, label: 'Saytda ko‘rinadi' })}
            </div>
          </div>
          <aside class="preview" aria-label="Ko‘rinishi">
            <p class="preview__label">Ko‘rinishi</p>
            <div class="preview__card" data-preview data-brand="lootbox">
              <div class="preview__media art" data-preview-media></div>
              <div class="preview__text">
                <p class="preview__kicker" data-preview-kicker></p>
                <p class="preview__title" data-preview-title></p>
                <p class="preview__sub" data-preview-sub></p>
                <span class="preview__cta" data-preview-cta></span>
              </div>
            </div>
            <p class="field__hint">Taxminiy ko‘rinish. Saytda sarlavha katta va harakatli chiqadi.</p>
          </aside>
        </div>
        <footer class="sheet__foot">
          <button class="btn btn--ghost" type="button" data-dialog-close>Bekor qilish</button>
          <button class="btn btn--primary" type="submit" data-save>${ic('check')}<span>Saqlash</span></button>
        </footer>
      </form>
    </dialog>

    <script type="application/json" id="page-data">${jsonScript({
      slides: slides.map((slide) => ({
        id: slide.id, brand: slide.brand, kicker: slide.kicker, title: slide.title, subtitle: slide.subtitle, cta_label: slide.cta_label,
        link_type: slide.link_type, link_value: slide.link_value, art: slide.art, tone: slide.tone, visible: slide.visible, image: slide.image,
      })),
      tones: TONES,
      covers,
    })}</script>`;

  return shell(c, {
    title: 'Hero slaydlar',
    active: 'slides',
    scripts: ['slides'],
    sortable: true,
    actions: html`<button class="btn btn--primary" type="button" data-new="lootbox">${ic('plus')}<span>Slayd qo‘shish</span></button>`,
    body: raw(String(body)),
  });
}
