// Tillar. Hozir faqat o'zbekcha. Rus tilini qo'shish:
//   1) uz.js ni ru.js nomi bilan nusxalab tarjima qiling;
//   2) quyidagi LOCALES ga  ru  ni qo'shing;
//   3) app.js da sayt yo'llarini '/ru' ostida ham ulang (izoh o'sha yerda).
// Bazadagi matnlar uchun *_ru ustunlari tayyor (nom, tavsif, slayd matnlari).
import uz from './uz.js';

export const LOCALES = { uz };
export const DEFAULT_LOCALE = 'uz';

export function dictionary(locale = DEFAULT_LOCALE) {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}

/** Bazadagi maydonning tanlangan tildagi qiymati (bo'sh bo'lsa — o'zbekchasi). */
export function localized(row, field, locale = DEFAULT_LOCALE) {
  if (!row) return '';
  if (locale !== DEFAULT_LOCALE) {
    const translated = row[`${field}_${locale}`];
    if (translated) return translated;
  }
  return row[field] ?? '';
}
