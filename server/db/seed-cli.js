// Buyruq qatoridan namuna (demo) ma'lumotni boshqarish. Namuna — LOOTBOX FIT bo'limidagi
// o'ylab topilgan kiyimlar; haqiqiy LOOTBOX katalogiga bu buyruq tegmaydi (u uchun: npm run catalog).
//   npm run seed              — namuna yo'q bo'lsa yozadi
//   npm run seed -- --reset   — eski namunani o'chirib, yangidan yozadi (o'z tovarlaringizga tegmaydi)
//   npm run seed -- --clear   — faqat namunani o'chiradi
// Server ishlab turgan bo'lsa, o'zgarish ko'rinishi uchun uni qayta ishga tushiring.
import { closeDb } from './index.js';
import { clearDemo, demoCounts, setMeta, saveSettings, getSettings } from './repo.js';
import { seedDemo, DEMO_SETTINGS } from './seed.js';

const args = new Set(process.argv.slice(2));
const existing = demoCounts();
const hasDemo = existing.products + existing.slides + existing.categories > 0;

if (args.has('--clear') || args.has('--reset')) {
  const removed = clearDemo();
  console.log(`Namuna o'chirildi: ${removed.products} tovar, ${removed.slides} slayd, ${removed.categories} kategoriya.`);
}

if (args.has('--clear')) {
  // faqat tozalash
} else if (hasDemo && !args.has('--reset')) {
  console.log('Namuna ma\'lumot allaqachon bor. Qayta yozish uchun:  npm run seed -- --reset');
} else {
  seedDemo();
  // Sozlamalarda bo'sh turgan maydonlargina to'ldiriladi — o'zingiz kiritganlar o'zgarmaydi.
  const current = getSettings();
  const patch = {};
  for (const [key, value] of Object.entries(DEMO_SETTINGS)) if (!current[key]) patch[key] = value;
  if (Object.keys(patch).length) saveSettings(patch);
  const after = demoCounts();
  console.log(`Namuna yozildi: ${after.products} tovar, ${after.slides} slayd, ${after.categories} kategoriya.`);
}

setMeta('seeded', '1');
closeDb();
