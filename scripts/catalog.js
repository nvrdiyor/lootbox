// Haqiqiy katalog:  npm run catalog
// Uzum'dagi LOOTBOX do'koni tovarlarini (server/db/catalog-data.js) bazaga yozadi va ularga loyihadagi
// fonsiz rasmlarni (server/db/catalog-media/) biriktiradi. Internet kerak emas. Qayta ishga tushirish
// xavfsiz: bor tovarga va rasmi bor tovarga tegilmaydi.
//
//   npm run catalog -- --replace-images   — loyihadagi rasmlar yangilangan bo'lsa (npm run cutouts): katalogning o'zi
//                                           qo'ygan eski rasmlarni yangisiga almashtiradi. Admin paneldan yuklangan
//                                           yoki o'zgartirilgan rasmlarga tegilmaydi.
//   npm run catalog -- --replace-images --force   — admin yuklaganlarini ham almashtiradi.
//
// Server ishlab turgan bo'lsa ham ishlatish mumkin: yangi tovar va rasmlar darhol ko'rinadi.
import { closeDb } from '../server/db/index.js';
import { seedCatalog, importCatalogMedia } from '../server/db/catalog.js';

const args = process.argv.slice(2);
const replace = args.includes('--replace-images');
const force = args.includes('--force');

const added = seedCatalog();
if (added.products + added.categories + added.slides > 0) {
  console.log(`\n  Katalog yozildi: ${added.products} tovar, ${added.categories} kategoriya, ${added.slides} slayd qo‘shildi.`);
} else {
  console.log('\n  Katalog tovarlari allaqachon bazada.');
}

const result = importCatalogMedia({ replace, force });
if (replace) {
  console.log(`  Rasmlar: ${result.replaced} tovarda almashtirildi, ${result.products - result.replaced} tovarga yangi biriktirildi (jami ${result.images} ta rasm).`);
  if (result.kept) console.log(`  Admin paneldan yuklangan rasmlari bor: ${result.kept} tovar — tegilmadi (majburlash: --force).`);
} else {
  console.log(`  Rasmlar: ${result.images} ta biriktirildi (${result.products} tovar). Rasmi bor edi: ${result.skipped} tovar.`);
}
if (result.missing) console.log(`  Bazada yo‘q (o‘chirilgan yoki havolasi o‘zgargan): ${result.missing} tovar — ularga tegilmadi.`);
for (const item of result.failed) console.log(`   ✗ ${item.name} — ${item.media}: ${item.error}`);
console.log('');

closeDb();
process.exit(result.failed.length ? 1 : 0);
