// Tovar muharriri: rasmlar, brendga qarab kategoriya va chizmalar, narx formati,
// "tugma qayerga olib boradi" jonli ko'rinishi, saqlash (Ctrl+S), o'chirish.
import { $, $$, api, toast, flash, confirmDialog, readForm, showErrors, clearErrors, setLoading, debounce, groupDigits, pageData } from '../core.js';
import { createUploader, bindPaste } from '../uploader.js';
import { trackForm, slugify } from '../form-state.js';
import { filterGlyphs, filterOptions, paintDefaultGlyph, radioValue } from '../brand-ui.js';

const form = $('[data-product-form]');

if (form) {
  const data = pageData();
  const productId = data.id || null;
  const saveButton = $('[data-save]', form);
  const tracker = trackForm(form, { cleanText: productId ? 'Barcha o‘zgarishlar saqlangan' : 'Yangi tovar' });

  // ---- Rasmlar
  const uploader = createUploader($('[data-uploader="product-images"]'), {
    images: data.images || [],
    onChange: () => tracker.markDirty(),
  });
  bindPaste(uploader);

  // ---- Brend → kategoriya va chizmalar
  const categorySelect = form.elements.category_id;
  const syncBrand = () => {
    const brand = radioValue(form, 'brand');
    filterOptions(categorySelect, brand);
    filterGlyphs(form, brand);
    syncDefaultGlyph();
  };
  function syncDefaultGlyph() {
    const brand = radioValue(form, 'brand');
    const art = categorySelect.selectedOptions[0]?.dataset.art || (brand === 'fit' ? 'tee' : 'box');
    paintDefaultGlyph(form, art);
  }
  for (const radio of $$('input[name="brand"]', form)) radio.addEventListener('change', syncBrand);
  categorySelect.addEventListener('change', syncDefaultGlyph);
  syncBrand();

  // ---- Havola nomi (slug): bo'sh bo'lsa nomdan yasalishini ko'rsatib turadi
  const nameInput = form.elements.name;
  const slugInput = $('[data-slug]', form);
  const syncSlugHint = () => {
    slugInput.placeholder = slugify(nameInput.value) || 'nomidan-yasaladi';
  };
  nameInput.addEventListener('input', syncSlugHint);
  slugInput.addEventListener('blur', () => {
    if (slugInput.value) slugInput.value = slugify(slugInput.value);
  });
  syncSlugHint();

  // ---- Narx: yozayotganda "129 000" ko'rinishiga keladi, chegirma foizi hisoblanadi
  const moneyInputs = $$('[data-money]', form);
  const discount = $('[data-discount]', form);
  const amount = (input) => Number(input.value.replace(/\D/g, '')) || 0;

  function formatMoney(input) {
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
    const formatted = groupDigits(input.value);
    input.value = formatted;
    let position = 0;
    let seen = 0;
    while (position < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[position])) seen += 1;
      position += 1;
    }
    try {
      input.setSelectionRange(position, position);
    } catch {
      // ba'zi brauzerlarda bu turdagi maydonda ishlamaydi
    }
  }
  function syncDiscount() {
    const price = amount(form.elements.price);
    const old = amount(form.elements.old_price);
    const off = price > 0 && old > price ? Math.round((1 - price / old) * 100) : 0;
    discount.hidden = !off;
    discount.textContent = off ? `Chegirma: −${off}%` : '';
  }
  for (const input of moneyInputs) {
    input.addEventListener('input', () => {
      formatMoney(input);
      syncDiscount();
    });
  }
  syncDiscount();

  // ---- Tugma qayerga olib boradi: server hisoblab beradi (saytdagi bilan aynan bir xil qoida)
  const preview = $('[data-dest-preview]', form);
  const destFields = $('.dest-fields', form);
  const DEST_NAME = { uzum: 'Uzum', channel: 'Telegram kanal', dm: 'Telegram lichka' };
  const DEST_FIELD = { uzum: 'uzum_url', channel: 'channel_url', dm: 'dm_username' };
  let destRequest = 0;

  async function refreshDest() {
    const values = readForm(form);
    const ticket = ++destRequest;
    preview.classList.add('is-loading');
    const result = await api('POST', '/admin/api/resolve', {
      brand: values.brand,
      name: values.name,
      dest_type: values.dest_type,
      uzum_url: values.uzum_url,
      channel_url: values.channel_url,
      dm_username: values.dm_username,
    });
    if (ticket !== destRequest) return; // shu orada yangiroq so'rov ketgan
    preview.classList.remove('is-loading');
    if (!result.ok) return;

    const info = result.data;
    const label = $('[data-dest-label]', preview);
    const url = $('[data-dest-url]', preview);
    const note = $('[data-dest-note]', preview);
    preview.classList.toggle('is-none', !info.primary);

    if (info.primary) {
      label.textContent = info.usesDefault
        ? `${info.primary.label} (standart yo‘nalish)`
        : info.primary.label;
      url.textContent = info.primary.url;
      note.hidden = !info.primary.fallback;
      note.textContent = info.primary.fallback
        ? `«${DEST_NAME[info.wanted] || info.wanted}» uchun havola kiritilmagan. Hozircha tugma «${DEST_NAME[info.primary.type]}»ga olib boradi.`
        : '';
    } else {
      label.textContent = 'Havola yo‘q';
      url.textContent = 'Saytda tugma o‘rnida «Tez orada sotuvda» yozuvi chiqadi.';
      note.hidden = false;
      note.textContent = 'Shu yerga havola yozing yoki Sozlamalar bo‘limida umumiy havolalarni to‘ldiring.';
    }

    for (const [type, name] of Object.entries(DEST_FIELD)) {
      $(`[data-field="${name}"]`, destFields)?.classList.toggle('is-primary', type === info.wanted);
    }
    showErrors(destFields, info.errors || {}, { focus: false });
  }
  const refreshDestSoon = debounce(refreshDest, 350);
  for (const radio of $$('input[name="dest_type"], input[name="brand"]', form)) radio.addEventListener('change', refreshDest);
  for (const name of Object.values(DEST_FIELD)) form.elements[name].addEventListener('input', refreshDestSoon);
  refreshDest();

  // ---- Saqlash
  const viewLink = $('[data-view-link]', form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveButton.disabled) return;
    if (uploader.busy()) {
      toast('Rasmlar hali yuklanmoqda. Tugashini kuting va qayta saqlang.', { type: 'error' });
      return;
    }
    clearErrors(form);
    const payload = { ...readForm(form), image_ids: uploader.ids() };

    setLoading(saveButton, true);
    const result = productId
      ? await api('PUT', `/admin/api/products/${productId}`, payload)
      : await api('POST', '/admin/api/products', payload);
    setLoading(saveButton, false);

    if (!result.ok) {
      const loose = showErrors(form, result.errors || {});
      tracker.error('Saqlanmadi. Xatolarni tuzatib, qayta urinib ko‘ring.');
      toast(loose[0] || result.error, { type: 'error' });
      return;
    }

    const product = result.data.product;
    const action = product.on_site ? { label: 'Saytda ko‘rish', href: product.url, newTab: true } : null;

    if (!productId) {
      tracker.markClean();
      tracker.allowLeave();
      flash('Tovar yaratildi', { action });
      location.assign(`/admin/products/${product.id}`);
      return;
    }

    slugInput.value = product.slug;
    if (viewLink) {
      viewLink.href = product.url;
      viewLink.hidden = !product.on_site;
    }
    if (Array.isArray(result.data.images)) uploader.reset(result.data.images);
    const stamp = $('[data-updated]', form);
    if (stamp) stamp.textContent = 'hozirgina';
    tracker.markClean('Saqlandi');
    toast(product.on_site ? 'Saqlandi' : 'Saqlandi. Tovar hozir saytda ko‘rinmaydi.', { action });
  });

  // ---- O'chirish
  $('[data-delete-product]', form)?.addEventListener('click', async () => {
    const yes = await confirmDialog({
      title: `«${nameInput.value || data.name || 'Tovar'}» o‘chirilsinmi?`,
      text: 'Tovar va uning rasmlari butunlay o‘chadi. Bu amalni ortga qaytarib bo‘lmaydi.',
      confirmLabel: 'O‘chirish',
    });
    if (!yes) return;
    const result = await api('DELETE', `/admin/api/products/${productId}`);
    if (!result.ok) {
      toast(result.error, { type: 'error' });
      return;
    }
    tracker.allowLeave();
    flash('Tovar o‘chirildi');
    location.assign('/admin/products');
  });
}
