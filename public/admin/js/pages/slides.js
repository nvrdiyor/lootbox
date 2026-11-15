// Hero slaydlar: oynada qo'shish va tahrirlash (jonli ko'rinish bilan), ko'rinishni
// yoqish/o'chirish, o'chirish, tartib.
import { $, $$, api, toast, flash, pageData, readForm, showErrors, clearErrors, setLoading } from '../core.js';
import { createUploader } from '../uploader.js';
import { filterGlyphs, filterTones, filterOptions, checkRadio, radioValue, applyTone } from '../brand-ui.js';
import { bindRows, bindDialogClose } from '../rows.js';

const dialog = $('[data-slide-dialog]');
const form = $('[data-slide-form]');

if (dialog && form) {
  const data = pageData();
  const byId = new Map((data.slides || []).map((slide) => [slide.id, slide]));
  const tones = data.tones || { lootbox: [], fit: [] };
  const covers = { product: {}, category: {}, brand: {}, ...(data.covers || {}) };
  const saveButton = $('[data-save]', form);
  const title = $('[data-dialog-title]', dialog);
  const linkError = $('[data-link-error]', form);
  const panels = $$('[data-link-panel]', form);
  const preview = $('[data-preview]', form);
  const previewMedia = $('[data-preview-media]', form);
  let editing = null;

  const uploader = createUploader($('[data-uploader="slide-image"]', form), { onChange: () => paint() });

  // ---- Jonli ko'rinish
  function currentTone(brand) {
    const list = tones[brand === 'fit' ? 'fit' : 'lootbox'] || [];
    const key = radioValue(form, 'tone');
    const exact = list.find((tone) => tone.key === key);
    if (exact) return exact;
    // "Avtomatik": saytda slayd raqami bo'yicha navbat bilan tanlanadi
    const seed = editing ? editing.id : 1;
    return list[Math.abs(seed - 1) % Math.max(1, list.length)] || null;
  }

  // Rasm yuklanmagan slayd saytda bog'langan tovar yoki kategoriya rasmlarini ko'rsatadi
  // (qoida server/site/slide-photos.js dagi bilan bir xil); bu yerda birinchi muqovasi chiqadi.
  function linkedCover(brand) {
    const type = radioValue(form, 'link_type');
    if (type === 'category') return covers.category[form.elements.link_category.value] || '';
    if (type === 'product' && covers.product[form.elements.link_product.value]) return covers.product[form.elements.link_product.value];
    return covers.brand[brand] || '';
  }

  function paint() {
    const brand = radioValue(form, 'brand');
    preview.dataset.brand = brand;
    $('[data-preview-kicker]', form).textContent = form.elements.kicker.value.trim();
    $('[data-preview-title]', form).textContent = form.elements.title.value.trim() || 'Sarlavha';
    $('[data-preview-sub]', form).textContent = form.elements.subtitle.value.trim();
    $('[data-preview-cta]', form).textContent = form.elements.cta_label.value.trim() || 'Ko‘rish';

    const photo = $('.thumb:not(.is-error) img', uploader.element);
    const source = photo && photo.getAttribute('src') ? photo.src : linkedCover(brand);
    if (source) {
      const img = document.createElement('img');
      img.src = source;
      img.alt = '';
      previewMedia.replaceChildren(img);
      previewMedia.classList.add('has-photo');
      return;
    }
    previewMedia.classList.remove('has-photo');
    const art = radioValue(form, 'art') || 'box';
    const glyph = $(`[data-glyph-key="${CSS.escape(art)}"] svg`, form);
    previewMedia.replaceChildren(...(glyph ? [glyph.cloneNode(true)] : []));
    applyTone(previewMedia, currentTone(brand));
  }

  // ---- Brend va havola turi
  function syncBrand() {
    const brand = radioValue(form, 'brand');
    filterGlyphs(form, brand);
    filterTones(form, brand);
    filterOptions(form.elements.link_category, brand);
    filterOptions(form.elements.link_product, brand);
    paint();
  }
  function syncLink() {
    const type = radioValue(form, 'link_type');
    for (const panel of panels) panel.hidden = panel.dataset.linkPanel !== type;
    linkError.hidden = true;
  }

  for (const radio of $$('input[name="brand"]', form)) radio.addEventListener('change', syncBrand);
  for (const radio of $$('input[name="link_type"]', form)) radio.addEventListener('change', syncLink);
  form.addEventListener('input', paint);
  form.addEventListener('change', paint);

  function open(slide, brand = 'lootbox') {
    editing = slide || null;
    form.reset();
    clearErrors(form);
    linkError.hidden = true;
    checkRadio(form, 'brand', slide?.brand || brand);
    form.elements.kicker.value = slide?.kicker || '';
    form.elements.title.value = slide?.title || '';
    form.elements.subtitle.value = slide?.subtitle || '';
    form.elements.cta_label.value = slide?.cta_label || '';
    form.elements.visible.checked = slide ? Boolean(slide.visible) : true;
    checkRadio(form, 'link_type', slide?.link_type || 'catalog');
    uploader.reset(slide?.image ? [slide.image] : []);
    syncBrand();
    if (slide) {
      checkRadio(form, 'art', slide.art);
      checkRadio(form, 'tone', slide.tone || '');
      form.elements.link_category.value = slide.link_type === 'category' ? slide.link_value : '';
      form.elements.link_product.value = slide.link_type === 'product' ? slide.link_value : '';
      form.elements.link_url.value = slide.link_type === 'url' ? slide.link_value : '';
    }
    syncLink();
    title.textContent = slide ? 'Slaydni tahrirlash' : 'Yangi slayd';
    // Belgilar hisoblagichlari forma tozalanganda yangilanmaydi — qo'lda turtamiz
    for (const input of [form.elements.title, form.elements.subtitle]) input.dispatchEvent(new Event('input', { bubbles: true }));
    paint();
    dialog.showModal();
    form.elements.title.focus();
  }

  for (const button of $$('[data-new]')) button.addEventListener('click', () => open(null, button.dataset.new));
  bindDialogClose(dialog);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveButton.disabled) return;
    if (uploader.busy()) {
      toast('Rasm hali yuklanmoqda. Tugashini kuting va qayta saqlang.', { type: 'error' });
      return;
    }
    const values = readForm(form);
    const linkValue = { category: values.link_category, product: values.link_product, url: values.link_url }[values.link_type] || '';
    const payload = {
      brand: values.brand,
      kicker: values.kicker,
      title: values.title,
      subtitle: values.subtitle,
      cta_label: values.cta_label,
      link_type: values.link_type,
      link_value: linkValue,
      image_id: uploader.ids()[0] || null,
      art: values.art || 'box',
      tone: values.tone || '',
      visible: values.visible,
    };
    setLoading(saveButton, true);
    const result = editing
      ? await api('PUT', `/admin/api/slides/${editing.id}`, payload)
      : await api('POST', '/admin/api/slides', payload);
    setLoading(saveButton, false);
    if (!result.ok) {
      const errors = { ...(result.errors || {}) };
      const linkMessage = errors.link_value;
      delete errors.link_value;
      const loose = showErrors(form, errors);
      linkError.hidden = !linkMessage;
      linkError.textContent = linkMessage || '';
      toast(linkMessage || loose[0] || result.error, { type: 'error' });
      return;
    }
    flash(editing ? 'Slayd saqlandi' : 'Slayd qo‘shildi');
    location.reload();
  });

  bindRows({
    base: '/admin/api/slides',
    rowSelector: '.srow',
    onEdit: (id) => {
      const slide = byId.get(id);
      if (slide) open(slide);
    },
    describeDelete: (row) => ({
      title: `«${row.dataset.name}» slaydi o‘chirilsinmi?`,
      text: 'Slayd va uning rasmi butunlay o‘chadi. Bu amalni ortga qaytarib bo‘lmaydi.',
    }),
    labels: {
      shown: 'Slayd saytda ko‘rinadi',
      hidden: 'Slayd saytdan yashirildi',
      deleted: 'Slayd o‘chirildi',
    },
  });
}
