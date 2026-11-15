// Formadagi saqlanmagan o'zgarishlarni kuzatadi: pastki panel holati, sahifadan chiqishda
// ogohlantirish, Ctrl+S bilan saqlash. Shu yerda nomdan havola nomi (slug) yasash ham bor.
import { $ } from './core.js';

/**
 * @param {HTMLFormElement} form
 * @param {{ cleanText?: string, dirtyText?: string }} [texts]
 */
export function trackForm(form, { cleanText = 'Barcha o‘zgarishlar saqlangan', dirtyText = 'Saqlanmagan o‘zgarishlar bor' } = {}) {
  const bar = $('[data-savebar]', form) || $('[data-savebar]');
  const status = $('[data-save-status]', bar || form);
  let dirty = false;
  let leaving = false;

  const paint = (text, error = false) => {
    if (status) status.textContent = text;
    bar?.classList.toggle('is-dirty', dirty && !error);
    bar?.classList.toggle('is-error', error);
  };

  const state = {
    get dirty() {
      return dirty;
    },
    markDirty() {
      dirty = true;
      paint(dirtyText);
    },
    markClean(text = cleanText) {
      dirty = false;
      paint(text);
    },
    /** Saqlab bo'lmadi: panel qizil nuqta bilan xabarni ko'rsatadi, o'zgarishlar saqlanmagan bo'lib qoladi */
    error(text) {
      paint(text, true);
    },
    /** Ataylab boshqa sahifaga o'tilayotganda ogohlantirish chiqmasin */
    allowLeave() {
      leaving = true;
    },
  };

  form.addEventListener('input', () => state.markDirty());
  form.addEventListener('change', () => state.markDirty());

  window.addEventListener('beforeunload', (event) => {
    if (!dirty || leaving) return;
    event.preventDefault();
    event.returnValue = '';
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
    event.preventDefault();
    if (!document.querySelector('dialog[open]')) form.requestSubmit();
  });

  return state;
}

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};
const APOSTROPHES = /['’‘ʻʼ`´]/g;

/** Serverdagi slugify bilan bir xil qoida (server/lib/text.js) — faqat oldindan ko'rsatish uchun */
export function slugify(input) {
  const lower = String(input ?? '').toLowerCase().replace(APOSTROPHES, '');
  let mapped = '';
  for (const ch of lower) mapped += CYRILLIC[ch] ?? ch;
  return mapped
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
