// Tovarlar ro'yxati: filtrlar (sahifa qayta yuklanmaydi), tezkor almashtirgichlar,
// nusxa olish, o'chirish, sudrab tartiblash.
import { $, $$, api, toast, flash, confirmDialog } from '../core.js';
import { makeSortable, visibleIds, applyOrder } from '../sortable-list.js';

const toolbar = $('[data-products]');

if (toolbar) {
  const groups = $$('[data-group]');
  const tabs = $$('[data-brand-tab]');
  const searchInput = $('[data-filter-search]');
  const categorySelect = $('[data-filter-category]');
  const stateSelect = $('[data-filter-state]');
  const note = $('[data-list-note]');
  const nomatch = $('[data-nomatch]');
  const allCategoryNodes = [...categorySelect.children].map((node) => node.cloneNode(true));

  const params = new URLSearchParams(location.search);
  const filter = {
    brand: ['lootbox', 'fit'].includes(params.get('brand')) ? params.get('brand') : '',
    category: params.get('category') || '',
    state: params.get('state') || '',
    q: params.get('q') || '',
  };

  const rowsOf = (group) => $$('.prow', group);

  function rebuildCategories() {
    // Brend tanlanganda faqat o'sha brendning kategoriyalari qoladi
    categorySelect.replaceChildren(
      ...allCategoryNodes
        .filter((node) => !filter.brand || !node.dataset.brand || node.dataset.brand === filter.brand)
        .map((node) => node.cloneNode(true)),
    );
    const exists = [...categorySelect.options].some((option) => option.value === filter.category);
    if (!exists) filter.category = '';
    categorySelect.value = filter.category;
  }

  function matches(row) {
    if (filter.category) {
      if (filter.category === 'none' ? row.dataset.category !== '' : row.dataset.category !== filter.category) return false;
    }
    switch (filter.state) {
      case 'visible': if (row.dataset.visible !== '1') return false; break;
      case 'hidden': if (row.dataset.visible !== '0') return false; break;
      case 'nophoto': if (row.dataset.photo !== '0') return false; break;
      case 'nodest': if (row.dataset.dest !== 'none') return false; break;
      case 'new': if (!$('[data-patch="badge_new"].is-on', row)) return false; break;
      case 'hit': if (!$('[data-patch="badge_hit"].is-on', row)) return false; break;
      default:
    }
    const term = filter.q.trim().toLowerCase();
    return !term || row.dataset.search.includes(term);
  }

  function apply() {
    let shown = 0;
    let total = 0;
    for (const group of groups) {
      const inBrand = !filter.brand || group.dataset.group === filter.brand;
      const rows = rowsOf(group);
      let visibleRows = 0;
      for (const row of rows) {
        const ok = inBrand && matches(row);
        row.hidden = !ok;
        if (ok) visibleRows += 1;
      }
      if (inBrand) total += rows.length;
      shown += visibleRows;
      // "Hammasi" ko'rinishida bo'sh brend bo'limi ham ko'rinadi (qo'shish tugmasi bilan)
      group.hidden = !inBrand || (visibleRows === 0 && rows.length > 0 && isFiltered());
      $('[data-group-count]', group).textContent = isFiltered() ? `${visibleRows} / ${rows.length} ta` : `${rows.length} ta`;
      const empty = $('[data-group-empty]', group);
      if (empty) {
        empty.hidden = rows.length > 0;
        if (!rows.length) empty.textContent = 'Bu bo‘limda hali tovar yo‘q.';
      }
    }
    nomatch.hidden = shown > 0 || !isFiltered();
    note.textContent = isFiltered() ? `${shown} ta tovar topildi (jami ${total} ta)` : '';

    for (const tab of tabs) {
      const active = tab.dataset.brandTab === filter.brand;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    stateSelect.value = filter.state;
    if (searchInput.value !== filter.q) searchInput.value = filter.q;

    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) if (value) next.set(key, value);
    const query = next.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }

  const isFiltered = () => Boolean(filter.category || filter.state || filter.q.trim());

  function updateCounts() {
    let all = 0;
    for (const group of groups) {
      const count = rowsOf(group).length;
      all += count;
      const tab = tabs.find((item) => item.dataset.brandTab === group.dataset.group);
      if (tab) $('i', tab).textContent = String(count);
    }
    const allTab = tabs.find((item) => item.dataset.brandTab === '');
    if (allTab) $('i', allTab).textContent = String(all);
    const sideCount = $('.side__count');
    if (sideCount) sideCount.textContent = String(all);
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      filter.brand = tab.dataset.brandTab;
      rebuildCategories();
      apply();
    });
  }
  categorySelect.addEventListener('change', () => {
    filter.category = categorySelect.value;
    apply();
  });
  stateSelect.addEventListener('change', () => {
    filter.state = stateSelect.value;
    apply();
  });
  searchInput.addEventListener('input', () => {
    filter.q = searchInput.value;
    apply();
  });
  $('[data-filter-reset]')?.addEventListener('click', () => {
    filter.category = '';
    filter.state = '';
    filter.q = '';
    rebuildCategories();
    apply();
    searchInput.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.target.closest('input, textarea, select, [contenteditable]')) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  // ---- Tezkor almashtirgichlar: Yangi / Xit / Tanlov / Saytda ko'rinadi
  const LABELS = {
    badge_new: ['«Yangi» belgisi qo‘yildi', '«Yangi» belgisi olindi'],
    badge_hit: ['«Xit» belgisi qo‘yildi', '«Xit» belgisi olindi'],
    featured: ['Bosh sahifadagi tanlovga qo‘shildi', 'Tanlovdan olindi'],
    visible: ['Saytda ko‘rinadi', 'Saytdan yashirildi'],
  };

  async function patch(row, field, value, revert) {
    const result = await api('PATCH', `/admin/api/products/${row.dataset.id}`, { field, value });
    if (!result.ok) {
      revert();
      toast(result.error, { type: 'error' });
      return;
    }
    if (field === 'visible') {
      row.dataset.visible = value ? '1' : '0';
      row.classList.toggle('is-hidden', !value);
      const view = $('[data-view]', row);
      if (view) view.hidden = !result.data.product.on_site;
    }
    toast(LABELS[field][value ? 0 : 1], { duration: 2200 });
    if (isFiltered()) apply();
  }

  document.addEventListener('click', async (event) => {
    const row = event.target.closest('.prow');
    if (!row) return;

    const flag = event.target.closest('button[data-patch]');
    if (flag) {
      const on = !flag.classList.contains('is-on');
      const set = (state) => {
        flag.classList.toggle('is-on', state);
        flag.setAttribute('aria-pressed', String(state));
      };
      set(on);
      await patch(row, flag.dataset.patch, on, () => set(!on));
      return;
    }

    if (event.target.closest('[data-duplicate]')) {
      const button = event.target.closest('[data-duplicate]');
      button.disabled = true;
      const result = await api('POST', `/admin/api/products/${row.dataset.id}/duplicate`);
      button.disabled = false;
      if (!result.ok) return toast(result.error, { type: 'error' });
      flash('Nusxa yaratildi. U hozircha yashirin: tekshirib, saytda ko‘rinadigan qiling.');
      location.assign(`/admin/products/${result.data.id}`);
      return;
    }

    if (event.target.closest('[data-delete]')) {
      const yes = await confirmDialog({
        title: `«${row.dataset.name}» o‘chirilsinmi?`,
        text: 'Tovar va uning rasmlari butunlay o‘chadi. Bu amalni ortga qaytarib bo‘lmaydi.',
        confirmLabel: 'O‘chirish',
      });
      if (!yes) return;
      const result = await api('DELETE', `/admin/api/products/${row.dataset.id}`);
      if (!result.ok) return toast(result.error, { type: 'error' });
      row.classList.add('is-removing');
      setTimeout(() => {
        row.remove();
        updateCounts();
        apply();
      }, 240);
      toast('Tovar o‘chirildi');
    }
  });

  document.addEventListener('change', async (event) => {
    const input = event.target.closest('input[data-patch]');
    const row = input?.closest('.prow');
    if (!row) return;
    const value = input.checked;
    input.disabled = true;
    await patch(row, input.dataset.patch, value, () => { input.checked = !value; });
    input.disabled = false;
  });

  // ---- Tartiblash
  for (const list of $$('[data-sortable]')) {
    makeSortable(list, {
      async onChange() {
        const result = await api('POST', '/admin/api/products/reorder', { brand: list.dataset.sortable, ids: visibleIds(list) });
        if (!result.ok) {
          toast(`${result.error} Tartib saqlanmadi.`, { type: 'error' });
          return;
        }
        applyOrder(list, result.data.order);
        toast('Tartib saqlandi', { duration: 1800 });
      },
    });
  }

  rebuildCategories();
  apply();
}
