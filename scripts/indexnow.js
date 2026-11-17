// Saytning hamma sahifalarini qidiruv tizimlariga (Yandex, Bing — IndexNow orqali) bir yo'la xabar qiladi:
//   npm run indexnow            — yuboradi
//   npm run indexnow -- --dry   — faqat nima yuborilishini ko'rsatadi
// Odatda kerak emas: admin panelda tovar saqlanganda o'zgargan sahifa o'zi xabar qilinadi (sozlamalarda o'chirilmagan
// bo'lsa). Bu buyruq saytni birinchi marta ishga tushirganda yoki katta o'zgarishdan keyin ishlatiladi.
// Faqat haqiqiy manzilli saytda ishlaydi: .env faylida SITE_URL=https://... bo'lishi kerak.
// Google bu usulni qo'llamaydi — unga Search Console'da sitemap.xml ko'rsatiladi (README'ga qarang).
import { config } from '../server/config.js';
import { closeDb } from '../server/db/index.js';
import { indexNowKey, submitUrls } from '../server/lib/indexnow.js';
import { siteEntries } from '../server/site/sitemap.js';

const dry = process.argv.includes('--dry');
let code = 0;
try {
  if (!config.siteUrl.startsWith('https://')) {
    console.error('\n  .env faylida SITE_URL=https://... yozilmagan: qidiruv tizimlariga faqat haqiqiy sayt manzili yuboriladi.\n');
    code = 1;
  } else {
    const paths = siteEntries().map((entry) => entry.path);
    const key = indexNowKey();
    console.log(`\n  Sayt: ${config.siteUrl}\n  Kalit fayli: ${config.siteUrl}/${key}.txt\n  Sahifalar: ${paths.length} ta`);
    if (dry) {
      for (const item of paths) console.log(`    ${item}`);
      console.log('\n  (--dry: hech narsa yuborilmadi)\n');
    } else {
      const result = await submitUrls(paths);
      if (result.ok) console.log(`\n  Yuborildi: ${result.count} ta manzil (javob: HTTP ${result.status}).\n`);
      else {
        console.error(`\n  Qabul qilinmadi: HTTP ${result.status}. Kalit fayli saytda ochilishini tekshiring (yuqoridagi manzil).\n`);
        code = 1;
      }
    }
  }
} catch (err) {
  console.error(`\n  Yuborib bo‘lmadi: ${err.message}\n`);
  code = 1;
} finally {
  closeDb();
}
process.exit(code);
