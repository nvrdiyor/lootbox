// Kategoriyalar va slaydlar ro'yxati uchun umumiy ishlar: ko'rinishni yoqish/o'chirish,
// o'chirish (tasdiq bilan), sudrab tartiblash, tahrirlash oynasini ochish.
import { $, $$, api, toast, flash, confirmDialog } from './core.js';
import { makeSortable, visibleIds, applyOrder } from './sortable-list.js';

/**
 * @param {{ base: string, rowSelector: string, onEdit: (id: number) => void,
 *   describeDelete: (row: HTMLElement) => { title: string, text: string },
 *   labels: { shown: string, hidden: string, deleted: string } }} options
 */
export function bindRows({ base, rowSelector, onEdit, describeDelete, labels }) {
  document.addEventListener('change', async (event) => {
    const input = event.target.closest('input[data-patch]');
    const row = input?.closest(rowSelector);
    if (!row) return;
    const value = input.checked;
    input.disabled = true;
    const result = await api('PATCH', `${base}/${row.dataset.id}`, { field: input.dataset.patch, value });
    input.disabled = false;
    if (!result.ok) {
      input.checked = !value;
      toast(result.error, { type: 'error' });
      return;
    }
    row.classList.toggle('is-hidden', !value);
    toast(value ? labels.shown : labels.hidden, { duration: 2200 });
  });

  document.addEventListener('click', async (event) => {
    const row = event.target.closest(rowSelector);
    if (!row) return;

    if (event.target.closest('[data-edit]')) {
      onEdit(Number(row.dataset.id));
      return;
    }

    const remove = event.target.closest('[data-delete]');
    if (!remove) return;
    const { title, text } = describeDelete(row);
    if (!(await confirmDialog({ title, text, confirmLabel: 'O‘chirish' }))) return;
    remove.disabled = true;
    const result = await api('DELETE', `${base}/${row.dataset.id}`);
    remove.disabled = false;
    if (!result.ok) {
      toast(result.error, { type: 'error' });
      return;
    }
    const list = row.parentElement;
    if (list.children.length <= 1) {
      // Oxirgi qator edi: bo'sh holat matni server tomonda chiziladi
      flash(labels.deleted);
      location.reload();
      return;
    }
    row.classList.add('is-removing');
    setTimeout(() => {
      row.remove();
      const count = $('.group__count', list.closest('.group'));
      if (count) count.textContent = `${list.children.length} ta`;
    }, 240);
    toast(labels.deleted);
  });

  for (const list of $$('[data-sortable]')) {
    makeSortable(list, {
      async onChange() {
        const result = await api('POST', `${base}/reorder`, { brand: list.dataset.sortable, ids: visibleIds(list) });
        if (!result.ok) {
          toast(`${result.error} Tartib saqlanmadi.`, { type: 'error' });
          return;
        }
        applyOrder(list, result.data.order);
        toast('Tartib saqlandi', { duration: 1800 });
      },
    });
  }
}

/** Oynani (dialog) yopish tugmalari va Esc */
export function bindDialogClose(dialog) {
  for (const button of $$('[data-dialog-close]', dialog)) button.addEventListener('click', () => dialog.close());
}
