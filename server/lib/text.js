// Matn yordamchilari: slug, narx formati, xususiyatlar ro'yxati.

// Ko'rinmas belgilar manba faylda turmasin — kod bilan yasaladi.
export const NBSP = String.fromCharCode(0xa0);

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

// o‘ / g‘ dagi belgi va tutuq belgisining barcha yozilishlari
const APOSTROPHES = /['’‘ʻʼ`´]/g;

/** "Oversize futbolka — Basic (qora)" → "oversize-futbolka-basic-qora" */
export function slugify(input, fallback = 'tovar') {
  const lower = String(input ?? '').toLowerCase().replace(APOSTROPHES, '');
  let mapped = '';
  for (const ch of lower) mapped += CYRILLIC[ch] ?? ch;
  const slug = mapped
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || fallback;
}

/** 129000 → "129 000" (ajratuvchi — uzilmaydigan bo'sh joy) */
export function formatNumber(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function discountPercent(price, oldPrice) {
  if (!price || !oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

/**
 * Xususiyatlar matni → ro'yxat. Har qator bitta xususiyat.
 * "Material: PTFE" → { key: 'Material', value: 'PTFE' }, oddiy qator → { key: '', value }
 */
export function parseFeatures(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-•*–—]\s+)?/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(':');
      if (at > 0 && at <= 40 && at < line.length - 1 && !/^https?$/i.test(line.slice(0, at))) {
        return { key: line.slice(0, at).trim(), value: line.slice(at + 1).trim() };
      }
      return { key: '', value: line };
    });
}

/** Tovar kodi: LB-014 / FT-003 */
export function productCode(product) {
  return `${product.brand === 'fit' ? 'FT' : 'LB'}-${String(product.id).padStart(3, '0')}`;
}

/** Matnni so'zlarga bo'ladi (animatsiya uchun) */
export function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

export function truncate(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/[\s,.;:!?-]+$/g, '') + '…';
}
