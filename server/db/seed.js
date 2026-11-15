// Demo ma'lumot: sayt birinchi ochilganda jonli ko'rinishi uchun.
// Hammasi is_demo = 1 bilan yoziladi — admin paneldan bir tugma bilan o'chirish mumkin.
//
// To'rtta tovar (glaydlar, switchlar, ARCANE gilamcha, grip stiker) Uzum'dagi haqiqiy
// LOOTBOX do'konidan olingan: nomi, narxi va havolasi o'sha yerdagidek. Qolganlari namuna.
import { get, tx, run, now } from './index.js';
import { createCategory, createProduct, createSlide, saveSettings, getMeta, setMeta, demoCounts } from './repo.js';

const UZUM = 'https://uzum.uz/uz';

const CATEGORIES = [
  // LOOTBOX
  { brand: 'lootbox', slug: 'glaydlar', name: 'Sichqoncha glaydlari', tagline: 'Sichqoncha yangidek sirpanadi', art: 'skates' },
  { brand: 'lootbox', slug: 'switchlar', name: 'Klaviatura switchlari', tagline: 'Hot-swap: kavsharlamasdan o‘rnatiladi', art: 'switch' },
  { brand: 'lootbox', slug: 'gilamchalar', name: 'Gilamchalar', tagline: 'Sichqoncha va butun stol uchun', art: 'mousepad' },
  { brand: 'lootbox', slug: 'grip', name: 'Grip stikerlar', tagline: 'Qo‘ldan sirg‘anmaydi', art: 'grip' },
  { brand: 'lootbox', slug: 'yoritish', name: 'Yoritish va dekor', tagline: 'Monitor lampalari va proyektorlar', art: 'lightbar' },
  { brand: 'lootbox', slug: 'aksessuarlar', name: 'Aksessuarlar', tagline: 'Stol va setup uchun foydali narsalar', art: 'stand' },
  // FIT
  { brand: 'fit', slug: 'futbolkalar', name: 'Futbolkalar', tagline: 'Oversize va klassik bichim', art: 'tee' },
  { brand: 'fit', slug: 'xudi', name: 'Xudi va svitshotlar', tagline: 'Og‘ir mato, issiq kapyushon', art: 'hoodie' },
  { brand: 'fit', slug: 'shimlar', name: 'Shim va shortilar', tagline: 'Harakatni cheklamaydi', art: 'joggers' },
  { brand: 'fit', slug: 'aksessuarlar', name: 'Aksessuarlar', tagline: 'Kepka, paypoq va boshqalar', art: 'cap' },
];

const PRODUCTS = [
  // ---------------- LOOTBOX ----------------
  {
    brand: 'lootbox', category: 'glaydlar', name: 'Sichqoncha glaydlari — Logitech G Pro X Superlight, Razer Viper',
    tagline: 'Teflon skeytlar: yumshoq va bir tekis sirpanish',
    price: 59000, old_price: 99000, badge_hit: 1,
    uzum_url: `${UZUM}/product/sichqoncha-glaydlari-logitech-3239880`,
    description:
      'Zavod glaydlari vaqt o‘tishi bilan yeyiladi va sichqoncha gilamchada «tirnala» boshlaydi. Bu to‘plam ularni yangisiga almashtiradi: teflon skeytlar gilamcha ustida yumshoq va bir tekis sirpanadi.\n\nO‘rnatish bir necha daqiqa oladi: eski glaydlarni ko‘chiring, yuzani arting va yangisini yopishtiring.',
    features: 'Material: teflon (PTFE)\nMos modellar: Logitech G Pro X Superlight, Razer Viper\nO‘rnatish: yopishqoq asos',
  },
  {
    brand: 'lootbox', category: 'switchlar', name: 'Mexanik klaviatura uchun switchlar — 3-pin MX, hot-swap',
    tagline: 'Kavsharlamasdan o‘rnatiladi. Remover sovg‘aga',
    price: 114000, old_price: 120000, badge_new: 1,
    uzum_url: `${UZUM}/product/mexanik-klaviatura-uchun-3594757`,
    description:
      'MX standartidagi 3-pin switchlar: hot-swap klaviaturaga kavsharlamasdan o‘rnatiladi. Eskirgan yoki yoqmagan switchlarni almashtirib, klaviaturani o‘zingizga moslaysiz.\n\nTo‘plamga switchlarni chiqarib olish uchun remover sovg‘a qilinadi.',
    features: 'Turi: 3-pin, MX standarti\nO‘rnatish: hot-swap\nSovg‘a: switch remover',
  },
  {
    brand: 'lootbox', category: 'gilamchalar', name: 'Game mousepad XL — 900×400 mm',
    tagline: 'Butun stolni qoplaydi: klaviaturaga ham, sichqonchaga ham joy',
    price: 129000, badge_hit: 1,
    description:
      'Katta o‘lchamli gilamcha klaviatura va sichqonchani bitta yuzaga joylaydi. Silliq mato sichqonchani tez yuritadi, rezina asos esa stolda sirpanmaydi.\n\nChetlari tikilgan — vaqt o‘tishi bilan titilmaydi.',
    features: 'O‘lchami: 900 × 400 mm\nQalinligi: 4 mm\nYuzasi: silliq mato\nAsosi: sirpanmaydigan rezina\nChetlari: tikilgan',
  },
  {
    brand: 'lootbox', category: 'yoritish', name: 'Monitor yoritgichi — Light Bar',
    tagline: 'Stol yorug‘, ekran yaltiramaydi',
    price: 220000, badge_new: 1, featured: 1,
    description:
      'Light Bar monitor ustiga o‘rnatiladi va yorug‘likni faqat stolga yo‘naltiradi: ekranda aks qaytmaydi, ko‘z kamroq charchaydi.\n\nUSB orqali ishlaydi, vintsiz mahkamlanadi — stolda joy egallamaydi.',
    features: 'Quvvat: USB, 5 V\nRang harorati: 3 xil rejim\nYorqinlik: sensorli boshqaruv\nMahkamlash: monitor ustiga, vintsiz',
  },
  {
    brand: 'lootbox', category: 'gilamchalar', name: 'ARCANE Zero FX — sichqoncha uchun gilamcha',
    tagline: 'Kompyuter stoli uchun taglik',
    price: 229000, old_price: 299000, badge_new: 1, badge_hit: 1,
    uzum_url: `${UZUM}/product/arcane-zero-fx-3599940`,
    description:
      'ARCANE Zero FX — sichqoncha uchun gilamcha va kompyuter stoli uchun taglik. Yuzasi sichqoncha sensoriga mos, asosi stolda sirpanmaydi.',
    features: 'Turi: sichqoncha gilamchasi, stol tagligi\nAsosi: sirpanmaydigan',
  },
  {
    brand: 'lootbox', category: 'yoritish', name: 'Astronavt proyektor — yulduzli osmon', art: 'projector',
    tagline: 'Xonani galaktikaga aylantiradi',
    price: 270000, badge_hit: 1,
    description:
      'Astronavt shaklidagi proyektor shift va devorlarga yulduzlar hamda tumanlik tasvirini tushiradi. Setup xonasi, yotoqxona yoki sovg‘a uchun.\n\nBoshi buriladi — nurni xohlagan tomonga yo‘naltirasiz.',
    features: 'Rejimlar: yulduzlar va tumanlik\nBoshqaruv: pult va tugmalar\nQuvvat: USB',
  },
  {
    brand: 'lootbox', category: 'grip', name: 'Sichqoncha uchun grip stiker — sirpanishga qarshi',
    tagline: 'Ofis va o‘yin uchun',
    price: 69000, old_price: 89000, badge_hit: 1,
    uzum_url: `${UZUM}/product/sichqoncha-uchun-sirpanishga-3428388`,
    description:
      'Grip stiker sichqonchaning yon va ustki qismiga yopishtiriladi: ushlash mustahkamlanadi, qo‘l terlasa ham sichqoncha sirg‘anmaydi. O‘yinda ham, kunlik ishda ham qo‘l keladi.',
    features: 'Vazifasi: sirpanishga qarshi\nQo‘llanilishi: ofis va o‘yin sichqonchalari',
  },
  {
    brand: 'lootbox', category: 'aksessuarlar', name: 'Magnitli qo‘l isitgich — 2 tasi 1 da', art: 'warmer',
    tagline: 'Sovuq kunlarda qo‘llarni isitadi',
    price: 220000, badge_new: 1,
    description:
      'Ikki bo‘lakka ajraladigan isitgich: magnit bilan birlashadi, ajratsangiz — har qo‘lga bittadan. Sovuq xonada o‘yin oldidan yoki ko‘chada qo‘l keladi.\n\nUSB orqali quvvatlanadi.',
    features: 'Bo‘laklar: 2 ta, magnitli\nQuvvatlash: USB',
  },
  {
    brand: 'lootbox', category: 'glaydlar', name: 'Sichqoncha glaydlari — Logitech G102 / G203',
    tagline: 'Eng ommabop sichqonchaga yangi sirpanish',
    price: 49000, old_price: 59000,
    description:
      'G102 va G203 uchun teflon glaydlar. Eskirgan zavod glaydlarini almashtiradi va sichqonchani yana yengil yuritadi.',
    features: 'Material: teflon (PTFE)\nMos modellar: Logitech G102, G203\nO‘rnatish: yopishqoq asos',
  },
  {
    brand: 'lootbox', category: 'aksessuarlar', name: 'Naushnik uchun podstavka',
    tagline: 'Naushnik joyida, stol tartibli',
    price: 129000,
    description:
      'Naushnikni stolda yotqizib qo‘yish o‘rniga podstavkaga iling: amortizatorlari ezilmaydi, stol esa bo‘sh qoladi.\n\nOg‘ir asos — ag‘darilmaydi.',
    features: 'Asosi: sirpanmaydigan\nMos keladi: to‘liq o‘lchamli naushniklarga',
  },
  {
    brand: 'lootbox', category: 'switchlar', name: 'Mexanik klaviatura uchun switchlar — taktil, 5-pin',
    tagline: 'Har bosishda aniq his',
    price: 129000, badge_new: 1,
    description:
      'Taktil switchlarda bosish o‘rtasida sezilarli «to‘siq» bor — tugma ishlaganini barmoq bilan his qilasiz. Matn yozish va aralash foydalanish uchun yaxshi tanlov.',
    features: 'Turi: taktil\nOyoqchalar: 5-pin\nO‘rnatish: hot-swap',
  },
  {
    brand: 'lootbox', category: 'glaydlar', name: 'Sichqoncha glaydlari — Logitech G502',
    tagline: 'Og‘ir sichqoncha ham yengil yuradi',
    price: 59000,
    description:
      'G502 uchun to‘liq to‘plam: barcha zavod glaydlari o‘rniga. Teflon og‘ir sichqonchani ham yengil va bir tekis yuritadi.',
    features: 'Material: teflon (PTFE)\nMos model: Logitech G502\nO‘rnatish: yopishqoq asos',
  },
  // ---------------- LOOTBOX FIT ----------------
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
    brand: 'lootbox', kicker: 'Xit tovar', title: 'Silliq sirpanish. Aniq nishon.',
    subtitle: 'Logitech va Razer sichqonchalari uchun teflon glaydlar — har bir harakat nazoratda.',
    cta_label: 'Glaydlarni ko‘rish', link_type: 'category', category: 'glaydlar', art: 'skates', tone: 'volt',
  },
  {
    brand: 'lootbox', kicker: 'Yangi kelgan', title: 'Har bosishda — his.',
    subtitle: 'Hot-swap switchlar: klaviaturani kavsharlamasdan o‘zingizga moslang.',
    cta_label: 'Switchlarni tanlash', link_type: 'category', category: 'switchlar', art: 'switch', tone: 'violet',
  },
  {
    brand: 'lootbox', kicker: 'Setup', title: 'Stolingiz — sizning maydoningiz.',
    subtitle: 'Gilamcha, yoritgich va aksessuarlar: setupni keyingi darajaga olib chiqing.',
    cta_label: 'Katalogni ochish', link_type: 'catalog', art: 'lightbar', tone: 'cyan',
  },
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
  ticker_lootbox: 'Texnika va gaming aksessuarlari\nUzum Market orqali yetkazib beriladi\nGlaydlar · Switchlar · Gilamchalar\nSetupingizga yangi daraja',
  ticker_fit: 'Kundalik hayot va sport uchun\nUzum Market orqali yetkazib beriladi\nFutbolka · Xudi · Jogger\nErkin bichim, zich mato',
  about_lootbox:
    'LOOTBOX — texnika va gaming aksessuarlari. Sichqoncha glaydlaridan mexanik switchlargacha: setupni tezroq, qulayroq va chiroyliroq qiladigan detallarni tanlaymiz.',
  about_fit:
    'LOOTBOX FIT — kundalik hayot va sport uchun zamonaviy kiyimlar. Erkin bichim, zich mato va ortiqcha bezaksiz dizayn: kiyim sizga xalaqit bermasligi kerak.',
  seo_title_lootbox: 'LOOTBOX — texnika va gaming aksessuarlari',
  seo_desc_lootbox:
    'Sichqoncha glaydlari, mexanik klaviatura switchlari, gilamchalar va setup aksessuarlari. Uzum Market orqali yetkazib beriladi.',
  seo_title_fit: 'LOOTBOX FIT — kundalik hayot va sport uchun kiyimlar',
  seo_desc_fit: 'Oversize futbolkalar, xudilar va joggerlar. Uzum Market orqali yetkazib beriladi.',
};

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

/** Baza bo'sh va hali demo yozilmagan bo'lsa — yozadi (birinchi ishga tushirishda). */
export function seedIfEmpty() {
  if (getMeta('seeded')) return false;
  const hasContent = get('SELECT (SELECT COUNT(*) FROM products) + (SELECT COUNT(*) FROM categories) AS n').n > 0;
  if (!hasContent) {
    seedDemo();
    saveSettings(SETTINGS);
  }
  setMeta('seeded', '1');
  return !hasContent;
}

export { demoCounts, SETTINGS as DEMO_SETTINGS };
