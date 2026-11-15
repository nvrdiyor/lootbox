// Brend tanlanganda formaning qolgan qismi unga moslashadi: faqat shu brendning chizmalari,
// ranglari va kategoriyalari qoladi.
import { $, $$ } from './core.js';

function filterTiles(root, attribute, brand) {
  const tiles = $$(`[${attribute}]`, root);
  let lost = false;
  for (const tile of tiles) {
    const owner = tile.getAttribute(attribute);
    const ok = owner === 'all' || owner === brand;
    const input = $('input', tile);
    tile.hidden = !ok;
    input.disabled = !ok;
    if (!ok && input.checked) {
      input.checked = false;
      lost = true;
    }
  }
  // Tanlangan variant yashirinib qolsa — ko'rinib turgan birinchisi tanlanadi
  if (lost || !tiles.some((tile) => $('input', tile).checked)) {
    const first = tiles.find((tile) => !tile.hidden);
    if (first) $('input', first).checked = true;
  }
}

/** Rasm o'rnidagi chizmalar (data-glyph-brand) */
export const filterGlyphs = (root, brand) => filterTiles(root, 'data-glyph-brand', brand);

/** Chizma ranglari (data-tone-brand) */
export const filterTones = (root, brand) => filterTiles(root, 'data-tone-brand', brand);

/** <select> ichida faqat shu brendga tegishli variantlar tanlanadigan bo'lib qoladi */
export function filterOptions(select, brand) {
  if (!select) return;
  for (const option of select.options) {
    const owner = option.dataset.brand;
    const ok = !owner || owner === brand;
    option.hidden = !ok;
    option.disabled = !ok;
  }
  for (const group of $$('optgroup', select)) {
    group.hidden = [...group.children].every((option) => option.disabled);
  }
  if (select.selectedOptions[0]?.disabled) select.value = '';
}

/** Radio tugmalar guruhidan qiymati mos (va o'chirilmagan) bittasini tanlaydi */
export function checkRadio(root, name, value) {
  const radios = $$(`input[type="radio"][name="${name}"]`, root);
  const match = radios.find((input) => input.value === String(value ?? '') && !input.disabled);
  if (match) match.checked = true;
  return Boolean(match);
}

export const radioValue = (root, name) => $(`input[type="radio"][name="${name}"]:checked`, root)?.value ?? '';

/** "Kategoriya bo'yicha" katakchasida hozir qaysi chizma chiqishini ko'rsatadi */
export function paintDefaultGlyph(root, artKey) {
  const slot = $('[data-glyph-default]', root);
  if (!slot) return;
  const source =
    $(`[data-glyph-key="${CSS.escape(artKey || 'box')}"] svg`, root) || $('[data-glyph-key="box"] svg', root);
  slot.replaceChildren(...(source ? [source.cloneNode(true)] : []));
}

/** Rang → CSS o'zgaruvchilari (server/site/art.js dagi toneStyle bilan bir xil) */
export function applyTone(element, tone) {
  if (!element || !tone) return;
  const light = Boolean(tone.bg);
  element.style.setProperty('--tone', tone.color);
  element.style.setProperty('--art-bg', light ? tone.bg : `color-mix(in oklab, ${tone.color} 8%, #101012)`);
  element.style.setProperty('--art-line', light ? tone.line : '#f5f4ef');
  element.style.setProperty('--art-garment', light ? tone.garment : '#f5f4ef');
}
