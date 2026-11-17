// Boshlang'ich ma'lumot: sayt birinchi ochilganda bo'sh turmasligi uchun.
//
// LOOTBOX — haqiqiy katalog: Uzum'dagi do'kondan olingan tovarlar (catalog-data.js), is_demo = 0.
// LOOTBOX FIT — namuna: do'konda hali tovar yo'q, shuning uchun bu yerdagi kiyimlar o'ylab topilgan
// va is_demo = 1 bilan yoziladi — admin paneldan bir tugma bilan o'chirish mumkin.
import { get, tx, run, now } from './index.js';
import { createCategory, createProduct, createSlide, saveSettings, getMeta, setMeta, demoCounts } from './repo.js';
import { seedCatalog, importCatalogMedia } from './catalog.js';

const UZUM = 'https://uzum.uz/uz';

const CATEGORIES = [
  { brand: 'fit', slug: 'futbolkalar', name: 'Futbolkalar', tagline: 'Oversize va klassik bichim', art: 'tee' },
  { brand: 'fit', slug: 'xudi', name: 'Xudi va svitshotlar', tagline: 'Og‘ir mato, issiq kapyushon', art: 'hoodie' },
  { brand: 'fit', slug: 'shimlar', name: 'Shim va shortilar', tagline: 'Harakatni cheklamaydi', art: 'joggers' },
  { brand: 'fit', slug: 'aksessuarlar', name: 'Aksessuarlar', tagline: 'Kepka, paypoq va boshqalar', art: 'cap' },
];

const PRODUCTS = [
  {
    brand: 'fit', category: 'futbolkalar', name: 'Oversize futbolka — Basic, qora',
    tagline: 'Zich paxta, erkin bichim',
    price: 129000, badge_new: 1,
    description:
      'Har kuni kiyiladigan asosiy futbolka: zich paxta shaklini saqlaydi, erkin bichim harakatni cheklamaydi.\n\nBosmasiz — har qanday kiyim bilan mos tushadi.',
    features: 'Mato: 100% paxta\nBichim: oversize\nO‘lchamlar: S – XL',
  },
  {
    brand: 'fit', category: 'futbolkalar', name: 'Oversize futbolka — Basic, oq',
    tagline: 'Zich paxta, erkin bichim',
    price: 129000,
    description:
      'Xuddi shu Basic futbolka — oq rangda. Zich mato shaffof emas, yuvilgandan keyin shaklini saqlaydi.',
    features: 'Mato: 100% paxta\nBichim: oversize\nO‘lchamlar: S – XL',
  },
  {
    brand: 'fit', category: 'xudi', name: 'Xudi — Heavyweight',
    tagline: 'Og‘ir mato, issiq kapyushon',
    price: 270000, badge_hit: 1, featured: 1,
    description:
      'Og‘ir matodan tikilgan xudi: shaklini ushlaydi, ichi tukli va issiq. Kapyushon ikki qavatli, cho‘ntak keng.\n\nKuz va qish uchun asosiy kiyim.',
    features: 'Mato: paxta, ichi tukli\nBichim: erkin\nO‘lchamlar: S – XXL',
  },
  {
    brand: 'fit', category: 'shimlar', name: 'Jogger shim — Flex',
    tagline: 'Harakatni cheklamaydi',
    price: 220000, badge_hit: 1,
    description:
      'Yumshoq trikotaj jogger: sport zali, sayr va uy uchun. To‘piqdagi manjet va beldagi ip shimni joyida ushlab turadi.',
    features: 'Mato: paxta va elastan\nBel: rezinka va ip\nO‘lchamlar: S – XL',
  },
  {
    brand: 'fit', category: 'xudi', name: 'Zip-xudi — Everyday',
    tagline: 'Zamokli, har kunga',
    price: 299000, badge_new: 1,
    description:
      'Zamokli xudi futbolka ustidan kiyiladi: salqin oqshom va bahor-kuz uchun.',
    features: 'Mato: paxta, ichi tukli\nO‘lchamlar: S – XL',
  },
  {
    brand: 'fit', category: 'aksessuarlar', name: 'Kepka — Classic',
    tagline: 'Oddiy shakl, sozlanadigan tasma',
    price: 89000, badge_new: 1,
    description: 'Klassik shakldagi kepka: zich paxta, orqada sozlanadigan tasma. Bitta o‘lcham ko‘pchilikka mos keladi.',
    features: 'Mato: paxta\nO‘lcham: sozlanadi',
  },
  {
    brand: 'fit', category: 'shimlar', name: 'Shorti — Move', art: 'shorts',
    tagline: 'Yengil, tizzadan yuqori',
    price: 149000, badge_hit: 1,
    description: 'Yengil shorti: mashg‘ulot va yoz uchun. Beli rezinkali, yon cho‘ntaklari chuqur.',
    features: 'Mato: paxta va elastan\nBel: rezinka va ip\nO‘lchamlar: S – XL',
  },
  {
    brand: 'fit', category: 'aksessuarlar', name: 'Paypoqlar to‘plami — 3 juft', art: 'socks',
    tagline: 'Zich, baland, har kunga',
    price: 59000,
    description: 'Baland paypoqlar to‘plami: zich to‘qima, tovon va barmoq qismi mustahkamlangan.',
    features: 'To‘plamda: 3 juft',
  },
];

const SLIDES = [
  {
    brand: 'fit', kicker: 'Birinchi kolleksiya', title: 'Har kun uchun. Har harakat uchun.',
    subtitle: 'Oversize futbolkalar, og‘ir xudilar va joggerlar — LOOTBOX FIT.',
    cta_label: 'Kolleksiyani ko‘rish', link_type: 'catalog', art: 'hoodie', tone: 'sand',
  },
  {
    brand: 'fit', kicker: 'Basic', title: 'Oddiy. Zich. O‘zingizniki.',
    subtitle: 'Ortiqcha bezaksiz, zich paxtadan tikilgan asosiy futbolkalar.',
    cta_label: 'Futbolkalarni ko‘rish', link_type: 'category', category: 'futbolkalar', art: 'tee', tone: 'sky',
  },
];

const SETTINGS = {
  default_dest: 'uzum',
  // Uzum'dagi haqiqiy do'konlar
  uzum_shop_lootbox: `${UZUM}/shop/lootbox`,
  uzum_shop_fit: `${UZUM}/shop/lootboxfit`,
  ticker_lootbox: 'Texnika va gaming aksessuarlari\nUzum Market orqali yetkazib beriladi\nGlaydlar · Switchlar · Gilamchalar · Grip stikerlar\nSetupingizga yangi daraja',
  ticker_fit: 'Kundalik hayot va sport uchun\nUzum Market orqali yetkazib beriladi\nFutbolka · Xudi · Jogger\nErkin bichim, zich mato',
  about_lootbox:
    'LOOTBOX — texnika va gaming aksessuarlari. Sichqoncha glaydlaridan mexanik switchlargacha: setupni tezroq, qulayroq va chiroyliroq qiladigan detallarni tanlaymiz.',
  about_fit:
    'LOOTBOX FIT — kundalik hayot va sport uchun zamonaviy kiyimlar. Erkin bichim, zich mato va ortiqcha bezaksiz dizayn: kiyim sizga xalaqit bermasligi kerak.',
  // Sarlavha va tavsifda odamlar qidiradigan so'zlar turadi (skeyt, kovrik; ruscha nomlar tavsif oxirida).
  // Eski bazalarda shu matnlarga schema.js dagi oxirgi o'zgarish o'tkazadi (egasi o'zgartirmagan bo'lsa).
  seo_title_lootbox: 'LOOTBOX — gaming aksessuarlari: skeytlar, kovriklar, switchlar',
  seo_desc_lootbox:
    'Sichqoncha skeytlari (glaydlar), kovriklar, mexanik klaviatura switchlari va grip stikerlar. O‘zbekiston bo‘ylab Uzum Market orqali yetkazib beriladi. Скейты и коврики для мыши, свитчи, грипсы.',
  seo_title_fit: 'LOOTBOX FIT — kundalik hayot va sport uchun kiyimlar',
  seo_desc_fit: 'Oversize futbolkalar, xudilar va joggerlar. Uzum Market orqali yetkazib beriladi.',
};

/** Namuna (LOOTBOX FIT) tovar, kategoriya va slaydlarini yozadi. */
export function seedDemo() {
  tx(() => {
    const categoryIds = new Map();
    for (const item of CATEGORIES) {
      const existing = get('SELECT id FROM categories WHERE brand = ? AND slug = ?', item.brand, item.slug);
      const id = existing ? existing.id : createCategory({ ...item, visible: 1, is_demo: 1 });
      categoryIds.set(`${item.brand}/${item.slug}`, id);
    }

    const base = now();
    PRODUCTS.forEach((item, index) => {
      const { category, ...data } = item;
      const id = createProduct({
        tagline: '', description: '', features: '', badge_new: 0, badge_hit: 0, featured: 0,
        dest_type: 'default', uzum_url: '', channel_url: '', dm_username: '', art: '',
        ...data,
        category_id: categoryIds.get(`${item.brand}/${category}`) ?? null,
        visible: 1,
        is_demo: 1,
        sort: index + 1,
      });
      // "Eng yangi" tartibi ham ro'yxat tartibiga mos bo'lsin
      run('UPDATE products SET created_at = ? WHERE id = ?', base - index * 60_000, id);
    });

    for (const item of SLIDES) {
      const { category, ...data } = item;
      createSlide({
        ...data,
        link_value: category ? String(categoryIds.get(`${item.brand}/${category}`) ?? '') : '',
        image_id: null,
        visible: 1,
        is_demo: 1,
      });
    }
  });
}

/**
 * Baza bo'sh va hali hech narsa yozilmagan bo'lsa — haqiqiy katalogni (fonsiz rasmlari bilan) va FIT
 * namunasini yozadi (birinchi ishga tushirishda).
 */
export function seedIfEmpty() {
  if (getMeta('seeded')) return false;
  const hasContent = get('SELECT (SELECT COUNT(*) FROM products) + (SELECT COUNT(*) FROM categories) AS n').n > 0;
  if (!hasContent) {
    seedCatalog();
    importCatalogMedia();
    seedDemo();
    saveSettings(SETTINGS);
  }
  setMeta('seeded', '1');
  return !hasContent;
}

export { demoCounts, SETTINGS as DEMO_SETTINGS };
