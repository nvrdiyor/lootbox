// Tovar muharriri (yangi tovar va mavjud tovarni tahrirlash).
import { html, raw, jsonScript } from '../../lib/html.js';
import { productCode, formatNumber } from '../../lib/text.js';
import { listCategories } from '../../db/repo.js';
import { LIMITS } from '../validate.js';
import { ic } from '../icons.js';
import { shell } from '../layout.js';
import { field, textarea, select, switchRow, segmented, glyphPicker, uploader, BRAND_LABEL } from '../ui.js';

const dateText = (ts) => {
  if (!ts) return '';
  // Toshkent vaqti (UTC+5)
  const d = new Date(ts + 5 * 3_600_000);
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getUTCDate())}.${two(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
};

/**
 * @param {object} c
 * @param {object|null} product mavjud tovar yoki null (yangi)
 * @param {{ brand?: string, category?: number|null }} preset yangi tovar uchun boshlang'ich tanlov
 */
export function productEditPage(c, product, preset = {}) {
  const isNew = !product;
  const categories = listCategories({});
  const item = product || {
    id: '', brand: preset.brand === 'fit' ? 'fit' : 'lootbox', category_id: preset.category ?? null, slug: '', name: '', tagline: '',
    description: '', features: '', price: null, old_price: null, badge_new: 0, badge_hit: 0, featured: 0, visible: 1,
    dest_type: 'default', uzum_url: '', channel_url: '', dm_username: '', art: '', images: [], is_demo: 0,
  };
  // Yangi tovarda kategoriya berilgan bo'lsa, brend ham shunga mos bo'ladi
  if (isNew && item.category_id) {
    const cat = categories.find((entry) => entry.id === item.category_id);
    if (cat) item.brand = cat.brand;
    else item.category_id = null;
  }
  const onSite = !isNew && item.visible && (!item.category || item.category.visible);

  const categoryOptions = [
    { value: '', label: 'Kategoriyasiz' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.visible ? cat.name : `${cat.name} (yashirin)`, data: { 'data-brand': cat.brand, 'data-art': cat.art } })),
  ];

  const body = html`
<form class="editor" data-product-form data-id="${item.id}" novalidate autocomplete="off">
  <div class="editor__main">
    <section class="card" id="rasmlar">
      <header class="card__head">
        <div><h2 class="card__title">Rasmlar</h2><p class="card__sub">Birinchi rasm muqova bo‘ladi. Tartibni sudrab o‘zgartiring. Eng ko‘pi ${LIMITS.images} ta.</p></div>
      </header>
      ${uploader({ id: 'product-images', multiple: true, max: LIMITS.images, note: 'Ctrl+V bilan ham qo‘yish mumkin.' })}
    </section>

    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Asosiy ma’lumot</h2></div></header>
      <div class="stack">
        ${field({ name: 'name', label: 'Nomi', value: item.name, required: true, maxlength: LIMITS.name, placeholder: 'Masalan: Sichqoncha glaydlari, Logitech G Pro X' })}
        ${field({ name: 'tagline', label: 'Qisqa izoh', value: item.tagline, maxlength: LIMITS.tagline, placeholder: 'Bir jumlada: tovar nima beradi', hint: 'Tovar sahifasida nom ostida chiqadi.' })}
        <div class="field" data-field="slug">
          <label class="field__label" for="f-slug">Havola nomi</label>
          <div class="field__control has-prefix">
            <span class="field__prefix">/tovar/</span>
            <input class="input input--mono" id="f-slug" name="slug" type="text" value="${item.slug}" maxlength="80" spellcheck="false" autocomplete="off" placeholder="nomidan-yasaladi" data-slug>
          </div>
          <p class="field__hint">${isNew ? 'Bo‘sh qoldirsangiz, nomdan o‘zi yasaladi.' : 'O‘zgartirsangiz, tovarning eski havolasi ishlamay qoladi.'}</p>
          <p class="field__error" data-error hidden></p>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Tavsif va xususiyatlar</h2></div></header>
      <div class="stack">
        ${textarea({ name: 'description', label: 'Tavsif', value: item.description, rows: 7, maxlength: LIMITS.description, counter: true, hint: 'Yangi paragraf uchun bitta bo‘sh qator qoldiring.' })}
        ${textarea({ name: 'features', label: 'Xususiyatlar', value: item.features, rows: 6, maxlength: LIMITS.features, mono: true, placeholder: 'Material: teflon (PTFE)\nQalinligi: 0,8 mm\nTo‘plamda: 2 dona', hint: 'Har qatorga bitta xususiyat: «Nomi: qiymati». Ikki nuqtasiz qator oddiy band bo‘lib chiqadi.' })}
      </div>
    </section>

    <section class="card" id="havola">
      <header class="card__head">
        <div><h2 class="card__title">Tugma havolasi</h2><p class="card__sub">Tovar tugmasi bosilganda xaridor qayerga o‘tishini tanlang.</p></div>
      </header>
      <div class="stack">
        ${segmented({
          name: 'dest_type',
          value: item.dest_type,
          label: 'Asosiy tugma qayerga olib boradi',
          className: 'seg--wrap',
          options: [
            { value: 'default', label: 'Standart', icon: 'settings' },
            { value: 'uzum', label: 'Uzum', icon: 'bag' },
            { value: 'channel', label: 'Telegram kanal', icon: 'telegram' },
            { value: 'dm', label: 'Telegram lichka', icon: 'chat' },
          ],
        })}
        <div class="dest-preview" data-dest-preview aria-live="polite">
          <span class="dest-preview__icon">${ic('link')}</span>
          <div class="dest-preview__body"><b data-dest-label>Tekshirilmoqda</b><p data-dest-url></p><p class="dest-preview__note" data-dest-note hidden></p></div>
        </div>
        <div class="dest-fields">
          ${field({ name: 'uzum_url', label: 'Uzum’dagi tovar havolasi', value: item.uzum_url, type: 'url', mono: true, placeholder: 'https://uzum.uz/uz/product/...', hint: 'Bo‘sh bo‘lsa, sozlamalardagi do‘kon havolasi ishlatiladi.', inputmode: 'url' })}
          ${field({ name: 'channel_url', label: 'Telegram kanal yoki post havolasi', value: item.channel_url, mono: true, placeholder: '@kanal yoki https://t.me/kanal/123', hint: 'Bo‘sh bo‘lsa, sozlamalardagi kanal ishlatiladi.' })}
          ${field({ name: 'dm_username', label: 'Lichka uchun username', value: item.dm_username ? `@${item.dm_username}` : '', mono: true, placeholder: '@username', hint: 'Bo‘sh bo‘lsa, sozlamalardagi username ishlatiladi.' })}
        </div>
        <p class="note">${ic('info')}<span>Uchala havolani ham yozish mumkin: asosiy tugmadan tashqari qolganlari tovar sahifasida kichik tugma bo‘lib chiqadi. Umumiy havolalar <a href="/admin/settings#havolalar">Sozlamalar</a> bo‘limida.</span></p>
      </div>
    </section>
  </div>

  <aside class="editor__side">
    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Holat</h2></div></header>
      <div class="switches">
        ${switchRow({ name: 'visible', checked: item.visible, label: 'Saytda ko‘rinadi', hint: 'O‘chirilsa, tovar saytdan yashiriladi.' })}
        ${switchRow({ name: 'badge_new', checked: item.badge_new, label: '«Yangi» belgisi', hint: '«Yangi kelganlar» karuselida chiqadi.' })}
        ${switchRow({ name: 'badge_hit', checked: item.badge_hit, label: '«Xit» belgisi', hint: '«Eng ko‘p olinadiganlar» karuselida chiqadi.' })}
        ${switchRow({ name: 'featured', checked: item.featured, label: 'Bosh sahifada tanlov', hint: 'Bosh sahifada katta blokda ko‘rsatiladi.' })}
      </div>
    </section>

    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Brend va kategoriya</h2></div></header>
      <div class="stack">
        ${segmented({ name: 'brand', value: item.brand, label: 'Brend', className: 'seg--full', options: [{ value: 'lootbox', label: BRAND_LABEL.lootbox }, { value: 'fit', label: BRAND_LABEL.fit }] })}
        ${select({ name: 'category_id', label: 'Kategoriya', value: item.category_id ?? '', options: categoryOptions, hint: html`Yangi kategoriya <a href="/admin/categories">Kategoriyalar</a> bo‘limida qo‘shiladi.` })}
      </div>
    </section>

    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Narx</h2></div></header>
      <div class="stack">
        ${field({ name: 'price', label: 'Narx', value: item.price != null ? formatNumber(item.price) : '', inputmode: 'numeric', suffix: 'so‘m', placeholder: '129 000', hint: 'Bo‘sh qoldirilsa, saytda narx ko‘rsatilmaydi.', extra: { 'data-money': true } })}
        ${field({ name: 'old_price', label: 'Eski narx', value: item.old_price != null ? formatNumber(item.old_price) : '', inputmode: 'numeric', suffix: 'so‘m', placeholder: '159 000', hint: 'Chegirmani ko‘rsatish uchun. Hozirgi narxdan katta bo‘lsin.', extra: { 'data-money': true } })}
        <p class="discount" data-discount hidden></p>
      </div>
    </section>

    <section class="card">
      <header class="card__head"><div><h2 class="card__title">Rasm o‘rnidagi belgi</h2><p class="card__sub">Rasm yuklanmagan bo‘lsa, shu chizma ko‘rsatiladi.</p></div></header>
      ${glyphPicker({ name: 'art', value: item.art || '', withDefault: true })}
    </section>

    ${isNew
      ? ''
      : html`<section class="card card--meta">
          <dl class="meta">
            <div><dt>Kod</dt><dd class="mono">${productCode(item)}</dd></div>
            <div><dt>Yaratilgan</dt><dd>${dateText(item.created_at)}</dd></div>
            <div><dt>O‘zgartirilgan</dt><dd data-updated>${dateText(item.updated_at)}</dd></div>
            ${item.is_demo ? html`<div><dt>Turi</dt><dd><span class="tag">demo</span></dd></div>` : ''}
          </dl>
          <div class="meta__actions">
            <a class="btn btn--ghost btn--block" href="/tovar/${item.slug}" target="_blank" rel="noopener" data-view-link${onSite ? '' : raw(' hidden')}>${ic('external')}<span>Saytda ko‘rish</span></a>
            <button class="btn btn--danger-ghost btn--block" type="button" data-delete-product>${ic('trash')}<span>Tovarni o‘chirish</span></button>
          </div>
        </section>`}
  </aside>

  <div class="savebar" data-savebar>
    <p class="savebar__status" data-save-status>${isNew ? 'Yangi tovar' : 'Barcha o‘zgarishlar saqlangan'}</p>
    <div class="savebar__actions">
      <a class="btn btn--ghost" href="/admin/products">Ortga</a>
      <button class="btn btn--primary" type="submit" data-save>${ic('check')}<span>${isNew ? 'Tovarni yaratish' : 'Saqlash'}</span></button>
    </div>
  </div>
</form>
<script type="application/json" id="page-data">${jsonScript({
    id: item.id || null,
    name: item.name,
    slug: item.slug,
    images: item.images,
    isNew,
  })}</script>`;

  return shell(c, {
    title: isNew ? 'Yangi tovar' : 'Tovarni tahrirlash',
    active: 'products',
    scripts: ['product-edit'],
    sortable: true,
    wide: true,
    back: { href: '/admin/products', label: 'Tovarlar' },
    body,
  });
}
