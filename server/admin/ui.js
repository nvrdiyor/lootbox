// Admin panelning qayta ishlatiladigan bo'laklari: maydonlar, almashtirgichlar,
// belgi (chizma) tanlagich, rasm yuklagich.
import { html, raw, attrs } from '../lib/html.js';
import { formatNumber, discountPercent } from '../lib/text.js';
import { artSvg, ART_OPTIONS, TONES, toneFor, toneStyle } from '../site/art.js';
import { ic } from './icons.js';

export const BRAND_LABEL = { lootbox: 'LOOTBOX', fit: 'LOOTBOX FIT' };
export const DEST_LABEL = { default: 'Standart', uzum: 'Uzum', channel: 'Telegram kanal', dm: 'Telegram lichka' };
export const DEST_SHORT = { uzum: 'Uzum', channel: 'Kanal', dm: 'Lichka' };

const errorSlot = () => html`<p class="field__error" data-error hidden></p>`;

/** Bir qatorli maydon */
export function field({
  name, label, value = '', type = 'text', hint = '', placeholder = '', required = false, maxlength = null,
  mono = false, inputmode = null, autocomplete = 'off', suffix = '', id = null, extra = {},
}) {
  const fid = id || `f-${name}`;
  return html`<div class="field" data-field="${name}">
    <label class="field__label" for="${fid}">${label}${required ? html`<span class="field__req" aria-hidden="true">*</span>` : ''}</label>
    <div class="field__control${suffix ? ' has-suffix' : ''}">
      <input${attrs({
        class: `input${mono ? ' input--mono' : ''}`, id: fid, name, type, value: value ?? '', placeholder: placeholder || null,
        required, maxlength, inputmode, autocomplete, spellcheck: mono ? 'false' : null, ...extra,
      })}>
      ${suffix ? html`<span class="field__suffix">${suffix}</span>` : ''}
    </div>
    ${hint ? html`<p class="field__hint">${hint}</p>` : ''}
    ${errorSlot()}
  </div>`;
}

/** Ko'p qatorli maydon */
export function textarea({ name, label, value = '', hint = '', placeholder = '', rows = 5, maxlength = null, mono = false, id = null, counter = false }) {
  const fid = id || `f-${name}`;
  return html`<div class="field" data-field="${name}">
    <div class="field__top">
      <label class="field__label" for="${fid}">${label}</label>
      ${counter && maxlength ? html`<span class="field__count" data-count-for="${fid}">${String(value || '').length} / ${maxlength}</span>` : ''}
    </div>
    <textarea${attrs({ class: `textarea${mono ? ' input--mono' : ''}`, id: fid, name, rows, maxlength, placeholder: placeholder || null, spellcheck: mono ? 'false' : null })}>${value ?? ''}</textarea>
    ${hint ? html`<p class="field__hint">${hint}</p>` : ''}
    ${errorSlot()}
  </div>`;
}

/** Ro'yxatdan tanlash. options: [{ value, label, data? }] yoki guruhlar: [{ group, options }] */
export function select({ name, label, value = '', options, hint = '', id = null, extra = {} }) {
  const fid = id || `f-${name}`;
  const option = (item) =>
    html`<option${attrs({ value: item.value, selected: String(item.value) === String(value ?? ''), ...(item.data || {}) })}>${item.label}</option>`;
  return html`<div class="field" data-field="${name}">
    ${label ? html`<label class="field__label" for="${fid}">${label}</label>` : ''}
    <div class="field__control field__control--select">
      <select${attrs({ class: 'input select', id: fid, name, ...extra })}>
        ${options.map((item) => (item.group ? html`<optgroup label="${item.group}">${item.options.map(option)}</optgroup>` : option(item)))}
      </select>
      ${ic('chevron-down', 'ic field__chev')}
    </div>
    ${hint ? html`<p class="field__hint">${hint}</p>` : ''}
    ${errorSlot()}
  </div>`;
}

/** Yoqish/o'chirish tugmachasi (qator ko'rinishida) */
export function switchRow({ name, checked = false, label, hint = '', extra = {} }) {
  return html`<label class="switch-row">
    <span class="switch-row__text"><b>${label}</b>${hint ? html`<small>${hint}</small>` : ''}</span>
    <span class="switch"><input${attrs({ type: 'checkbox', name, checked: Boolean(checked), ...extra })}><span class="switch__track" aria-hidden="true"></span></span>
  </label>`;
}

/** Faqat tugmachaning o'zi (ro'yxat qatorlari uchun) */
export function switchOnly({ checked = false, label, extra = {} }) {
  return html`<label class="switch" title="${label}"><input${attrs({ type: 'checkbox', checked: Boolean(checked), 'aria-label': label, ...extra })}><span class="switch__track" aria-hidden="true"></span></label>`;
}

/** Bir nechta variantdan bittasini tanlash (segmentli) */
export function segmented({ name, value, options, label = '', hint = '', className = '' }) {
  return html`<fieldset class="field field--seg" data-field="${name}">
    ${label ? html`<legend class="field__label">${label}</legend>` : ''}
    <div class="seg ${className}">
      ${options.map(
        (item) => html`<label class="seg__item">
          <input${attrs({ type: 'radio', name, value: item.value, checked: String(item.value) === String(value) })}>
          <span>${item.icon ? ic(item.icon) : ''}${item.label}</span>
        </label>`,
      )}
    </div>
    ${hint ? html`<p class="field__hint">${hint}</p>` : ''}
    ${errorSlot()}
  </fieldset>`;
}

/**
 * Rasm o'rnidagi belgini tanlash. Har bir variant data-brand bilan belgilanadi —
 * JS tanlangan brendga mos kelmaganlarini yashiradi ("box" ikkala brendda ham bor).
 */
export function glyphPicker({ name = 'art', value = '', label, hint = '', withDefault = false, defaultLabel = 'Kategoriya bo‘yicha' }) {
  const tile = (key, text, brand, checked, style) => html`<label class="glyph" data-glyph-brand="${brand}">
    <input${attrs({ type: 'radio', name, value: key, checked })}>
    <span class="glyph__tile art" style="${style}"${key === '' ? raw(' data-glyph-default') : attrs({ 'data-glyph-key': key })}>${key === '' ? '' : artSvg(key)}</span>
    <span class="glyph__label">${text}</span>
  </label>`;
  return html`<fieldset class="field glyphs" data-field="${name}" data-glyphs>
    ${label ? html`<legend class="field__label">${label}</legend>` : ''}
    <div class="glyphs__grid">
      ${withDefault ? tile('', defaultLabel, 'all', value === '', toneStyle(toneFor('lootbox', 1))) : ''}
      ${ART_OPTIONS.map((item) =>
        tile(item.key, item.label, item.key === 'box' ? 'all' : item.brand, value === item.key, toneStyle(toneFor(item.brand, 1))),
      )}
    </div>
    ${hint ? html`<p class="field__hint">${hint}</p>` : ''}
    ${errorSlot()}
  </fieldset>`;
}

/** Chizma rangi (slaydlar uchun). Bo'sh qiymat — avtomatik. */
export function tonePicker({ name = 'tone', value = '', label }) {
  const swatch = (key, brand, tone) => html`<label class="tone" data-tone-brand="${brand}" title="${key || 'Avtomatik'}">
    <input${attrs({ type: 'radio', name, value: key, checked: value === key })}>
    <span class="tone__dot${key ? '' : ' tone__dot--auto'}" style="${tone ? `--c:${tone.bg || tone.color};--c2:${tone.bg ? tone.garment : tone.color}` : ''}">${key ? '' : 'A'}</span>
    <span class="sr-only">${key || 'Avtomatik'}</span>
  </label>`;
  return html`<fieldset class="field" data-field="${name}" data-tones>
    ${label ? html`<legend class="field__label">${label}</legend>` : ''}
    <div class="tones">
      ${swatch('', 'all', null)}
      ${TONES.lootbox.map((tone) => swatch(tone.key, 'lootbox', tone))}
      ${TONES.fit.map((tone) => swatch(tone.key, 'fit', tone))}
    </div>
    ${errorSlot()}
  </fieldset>`;
}

/**
 * Rasm yuklagich. Boshlang'ich rasmlar JSON ichida beriladi, kartochkalarni JS chizadi.
 * multiple: bir nechta rasm (tovar); aks holda bitta (kategoriya, slayd).
 */
export function uploader({ id, multiple = false, max = 1, note = '', title = '' }) {
  return html`<div class="uploader${multiple ? ' uploader--multi' : ' uploader--single'}" data-uploader="${id}" data-max="${max}"${multiple ? raw(' data-multiple') : ''}>
    <ul class="uploader__list" data-uploader-list role="list" aria-label="Yuklangan rasmlar"></ul>
    <div class="dropzone" data-dropzone>
      <input${attrs({ class: 'sr-only', type: 'file', id: `${id}-input`, accept: 'image/jpeg,image/png,image/webp', multiple, 'data-uploader-input': true })}>
      <label class="dropzone__label" for="${id}-input">
        <span class="dropzone__icon">${ic('upload')}</span>
        <span class="dropzone__title">${title || (multiple ? 'Rasmlarni shu yerga tashlang yoki tanlang' : 'Rasmni shu yerga tashlang yoki tanlang')}</span>
        <span class="dropzone__hint">JPG, PNG yoki WebP. Bitta fayl 25 MB gacha.${note ? ` ${note}` : ''}</span>
      </label>
    </div>
    <p class="field__error" data-uploader-error hidden></p>
  </div>`;
}

/** Kichik rasm (ro'yxatlarda): surat bo'lsa surat, bo'lmasa chizma */
export function productThumb(product, className = 'pthumb') {
  const tone = toneFor(product.brand, product.id);
  const cover = product.images[0];
  // Fonsiz rasm (tovarning o'zi) kesilmasdan, kartochka foni ustida ko'rsatiladi
  return html`<span class="${className} art${cover ? (cover.cutout ? ' has-cutout' : ' has-photo') : ''}" style="${toneStyle(tone)}">${cover
    ? html`<img${cover.cutout ? raw(' class="is-cutout"') : ''} src="${cover.thumb_url}" alt="" loading="lazy" decoding="async" width="${cover.width}" height="${cover.height}">`
    : artSvg(product.art || product.category?.art || 'box')}</span>`;
}

export function priceText(product) {
  if (product.price == null) return html`<span class="muted">Narx yo‘q</span>`;
  const off = discountPercent(product.price, product.old_price);
  return html`<span class="money"><b>${formatNumber(product.price)}</b> <small>so‘m</small></span>${off
    ? html`<span class="money-old"><s>${formatNumber(product.old_price)}</s><i>−${off}%</i></span>`
    : ''}`;
}

export function brandChip(brand) {
  return html`<span class="chip chip--${brand}">${BRAND_LABEL[brand] || brand}</span>`;
}

export function emptyState({ icon = 'box', title, text = '', action = '' }) {
  return html`<div class="empty">
    <span class="empty__icon">${ic(icon)}</span>
    <h2 class="empty__title">${title}</h2>
    ${text ? html`<p class="empty__text">${text}</p>` : ''}
    ${action}
  </div>`;
}
