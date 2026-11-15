// Ro'yxatni sudrab tartiblash (SortableJS) + klaviatura bilan: tutqichga fokus qilib
// yuqoriga/pastga strelkalarni bosing.
const visible = (el) => el && !el.hidden;

function sibling(el, direction) {
  let node = direction < 0 ? el.previousElementSibling : el.nextElementSibling;
  while (node && !visible(node)) node = direction < 0 ? node.previousElementSibling : node.nextElementSibling;
  return node;
}

/**
 * @param {HTMLElement} list
 * @param {{ handle?: string, onChange: (list: HTMLElement) => void }} options
 */
export function makeSortable(list, { handle = '[data-grip]', onChange }) {
  if (!list) return null;

  list.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const grip = event.target.closest(handle);
    if (!grip || !list.contains(grip)) return;
    const item = grip.closest('li');
    const target = sibling(item, event.key === 'ArrowUp' ? -1 : 1);
    if (!item || !target) return;
    event.preventDefault();
    if (event.key === 'ArrowUp') target.before(item);
    else target.after(item);
    grip.focus();
    onChange(list);
  });

  if (!window.Sortable) return null;
  return new window.Sortable(list, {
    handle,
    animation: 180,
    ghostClass: 'is-ghost',
    chosenClass: 'is-chosen',
    scroll: true,
    bubbleScroll: true,
    onEnd(event) {
      if (event.oldIndex !== event.newIndex) onChange(list);
    },
  });
}

/** Ro'yxatdagi ko'rinib turgan qatorlarning id'lari (ekrandagi tartibda) */
export function visibleIds(list) {
  return [...list.children].filter(visible).map((item) => Number(item.dataset.id)).filter(Boolean);
}

/** Server qaytargan to'liq tartib bo'yicha qatorlarni joylashtiradi (yashirin qatorlar ham o'z o'rnida turadi) */
export function applyOrder(list, order) {
  const byId = new Map([...list.children].map((item) => [Number(item.dataset.id), item]));
  for (const id of order) {
    const item = byId.get(Number(id));
    if (item) list.append(item);
  }
}
