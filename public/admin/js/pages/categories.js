// Kategoriyalar: oynada qo'shish va tahrirlash, ko'rinishni yoqish/o'chirish, o'chirish, tartib.
import { $, $$, api, toast, flash, pageData, readForm, showErrors, clearErrors, setLoading } from '../core.js';
import { createUploader } from '../uploader.js';
import { filterGlyphs, checkRadio, radioValue } from '../brand-ui.js';
import { bindRows, bindDialogClose } from '../rows.js';

const dialog = $('[data-category-dialog]');
const form = $('[data-category-form]');

if (dialog && form) {
  const byId = new Map((pageData().categories || []).map((category) => [category.id, category]));
  const uploader = createUploader($('[data-uploader="category-image"]', form));
  const saveButton = $('[data-save]', form);
  const title = $('[data-dialog-title]', dialog);
  const slugPrefix = $('[data-slug-prefix]', form);
  let editing = null;

  // Brend o'zgartirilsa, kategoriya tovarlari ham birga ko'chadi — shuni eslatib turadi
  const moveNote = document.createElement('p');
  moveNote.className = 'field__hint';
  moveNote.hidden = true;
  $('[data-field="brand"]', form).append(moveNote);

  function syncBrand() {
    const brand = radioValue(form, 'brand');
    filterGlyphs(form, brand);
    slugPrefix.textContent = brand === 'fit' ? '/fit/katalog/' : '/katalog/';
    const moved = editing && editing.brand !== brand && editing.product_total > 0;
    moveNote.hidden = !moved;
    moveNote.textContent = moved ? `Shu kategoriyadagi ${editing.product_total} ta tovar ham yangi brendga o‘tadi.` : '';
  }
  for (const radio of $$('input[name="brand"]', form)) radio.addEventListener('change', syncBrand);

  function open(category, brand = 'lootbox') {
    editing = category || null;
    form.reset();
    clearErrors(form);
    checkRadio(form, 'brand', category?.brand || brand);
    form.elements.name.value = category?.name || '';
    form.elements.tagline.value = category?.tagline || '';
    form.elements.slug.value = category?.slug || '';
    form.elements.visible.checked = category ? Boolean(category.visible) : true;
    syncBrand();
    if (category) checkRadio(form, 'art', category.art);
    uploader.reset(category?.image ? [category.image] : []);
    title.textContent = category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya';
    dialog.showModal();
    form.elements.name.focus();
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
    const payload = {
      brand: values.brand,
      name: values.name,
      tagline: values.tagline,
      slug: values.slug,
      art: values.art || 'box',
      image_id: uploader.ids()[0] || null,
      visible: values.visible,
    };
    setLoading(saveButton, true);
    const result = editing
      ? await api('PUT', `/admin/api/categories/${editing.id}`, payload)
      : await api('POST', '/admin/api/categories', payload);
    setLoading(saveButton, false);
    if (!result.ok) {
      const loose = showErrors(form, result.errors || {});
      toast(loose[0] || result.error, { type: 'error' });
      return;
    }
    flash(editing ? 'Kategoriya saqlandi' : 'Kategoriya qo‘shildi');
    location.reload();
  });

  bindRows({
    base: '/admin/api/categories',
    rowSelector: '.crow',
    onEdit: (id) => {
      const category = byId.get(id);
      if (category) open(category);
    },
    describeDelete: (row) => {
      const total = byId.get(Number(row.dataset.id))?.product_total || 0;
      return {
        title: `«${row.dataset.name}» kategoriyasi o‘chirilsinmi?`,
        text: total
          ? `Ichidagi ${total} ta tovar o‘chmaydi, lekin kategoriyasiz qoladi. Bu amalni ortga qaytarib bo‘lmaydi.`
          : 'Bu amalni ortga qaytarib bo‘lmaydi.',
      };
    },
    labels: {
      shown: 'Kategoriya saytda ko‘rinadi',
      hidden: 'Kategoriya va undagi tovarlar saytdan yashirildi',
      deleted: 'Kategoriya o‘chirildi',
    },
  });
}
