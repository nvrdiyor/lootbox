// Haqiqiy katalog: Uzum Market'dagi LOOTBOX do'konidan (https://uzum.uz/uz/shop/lootbox).
// Do'kondagi 4 ta e'lonning har bir varianti (rang, model) saytda alohida tovar: nomi, narxi va
// tavsifi o'sha yerdan olingan (2026-yil noyabr holati). Narx o'zgarsa — admin paneldan tahrirlanadi;
// bu fayl faqat boshlang'ich yozuv uchun ishlatiladi.
//
// media: tovar rasmlari — server/db/catalog-media/ papkasidagi fayl nomlari (kengaytmasiz).
// Bu rasmlarda faqat tovarning o'zi bor, orqa fonsiz: ular do'kondagi e'lon rasmlaridan kesib olingan
// (qanday kesilgani: scripts/cutouts.js). Saytga `npm run catalog` yoki birinchi ishga tushirish yozadi.

const UZUM = 'https://uzum.uz/uz/product';
const sku = (path, id) => `${UZUM}/${path}?skuId=${id}`;

const GLIDES = 'sichqoncha-glaydlari-logitech-3239880';
const SWITCHES = 'mexanik-klaviatura-uchun-3594757';
const ARCANE = 'arcane-zero-fx-3599940';
const GRIP = 'sichqoncha-uchun-sirpanishga-3428388';

export const CATALOG_CATEGORIES = [
  { brand: 'lootbox', slug: 'glaydlar', name: 'Sichqoncha glaydlari', tagline: 'Sichqoncha yangidek sirpanadi', art: 'skates' },
  { brand: 'lootbox', slug: 'switchlar', name: 'Klaviatura switchlari', tagline: 'Hot-swap: lehimsiz o‘rnatiladi', art: 'switch' },
  { brand: 'lootbox', slug: 'gilamchalar', name: 'Gilamchalar', tagline: 'Sichqonchaga keng maydon', art: 'mousepad' },
  { brand: 'lootbox', slug: 'grip', name: 'Grip stikerlar', tagline: 'Qo‘l terlasa ham sirpanmaydi', art: 'grip' },
];

// ---- Umumiy matnlar ----------------------------------------------------------

const DOT_GLIDES_TEXT =
  'Sichqoncha gilamcha ustida avvalgidek silliq yurmayaptimi? Ko‘pincha sabab qurilmaning o‘zida emas, ostidagi yeyilgan zavod oyoqchalarida bo‘ladi. Bu to‘plam ularni yangisiga almashtiradi: PTFE (teflon) ishqalanishni kamaytiradi va sichqoncha yengil, bir tekis sirpanadi.\n\n' +
  'Yumaloq universal shakl ko‘pchilik sichqonchalarga mos keladi: burchaklarga va sensor atrofiga 4–5 ta nuqtaga yopishtiriladi. To‘plamdagi 20 dona bir necha marta almashtirishga yetadi.\n\n' +
  'O‘rnatish: eski oyoqchalarni ko‘chiring, yuzani spirtli salfetka bilan artib quriting, yangisini yopishtirib, 10–15 soniya bosib turing.';

const dotGlides = (color) =>
  `Material: PTFE (teflon)\nTo‘plamda: 20 dona\nQalinligi: 0,8 ± 0,05 mm\nShakli: yumaloq, universal\nRangi: ${color}\nO‘rnatish: yopishqoq asos`;

const MODEL_GLIDES_TAGLINE = 'Aynan shu model shaklida kesilgan PTFE glaydlar';
const MODEL_GLIDES_HOWTO =
  'O‘rnatish: eski oyoqchalarni ko‘chiring, yuzani spirtli salfetka bilan artib quriting, yangisini yopishtirib, 10–15 soniya bosib turing.';

const SWITCH_TEXT =
  '3-pin, MX tipidagi «+» stem: MX keycaplar va MX tipidagi hot-swap klaviaturalarga mos keladi. Korpusi shaffof, LED oynasi bor — RGB yorug‘lik yorqin ko‘rinadi. Resursi — 50 million bosish.\n\n' +
  'Har bir buyurtmaga keycap va switch remover sovg‘a qilinadi. Uzum’dagi sahifada 20 va 60 donalik to‘plamlar ham bor.\n\n' +
  'Eslatma: hot-swap klaviaturalarda switchlar lehimsiz almashtiriladi. Lehimlangan klaviaturada almashtirish uchun lehimlash kerak bo‘ladi.';

const switchFeatures = (type, force, sound) =>
  `Turi: ${type}\nBosish kuchi: ${force}\nOvozi: ${sound}\nPinlar: 3-pin, MX «+» stem\nResursi: 50 mln bosish\nTo‘plamda: 30 dona + remover sovg‘a`;

const ARCANE_TEXT =
  'ARCANE Zero FX — o‘yin va ish uchun keng gilamcha. 450×400 mm maydon sichqonchani erkin yuritishga yetadi: past DPI bilan o‘ynaydiganlar uchun ayni muddao.\n\n' +
  '6 mm qalin ko‘pik qatlam bilak va stol orasidagi bosimni kamaytiradi — uzoq o‘yinda ham qo‘l charchamaydi. Silliq mato yuzada optik va lazer sensorlar aniq ishlaydi, rezina asos esa gilamchani stolda mahkam ushlab turadi.\n\n' +
  'Qirralari tikilmagan, burchaklari yumaloq: bilakni ishqalamaydi.';

const arcaneFeatures = (color) =>
  `O‘lchami: 450 × 400 mm\nQalinligi: 6 mm\nYuzasi: silliq mato\nAsosi: sirpanmaydigan rezina\nQirralari: tikilmagan, burchaklari yumaloq\nRangi: ${color}`;

const GRIP_TAGLINE = 'Romb naqshli yuza: qo‘l terlasa ham sirpanmaydi';
const GRIP_TEXT =
  'Qizg‘in o‘yinda yoki uzoq ish kunida sichqoncha qo‘ldan sirpanib ketadimi? Grip stiker yuzaga romb naqshli tekstura qo‘shadi: kaft terlaganda ham ushlash barqaror bo‘ladi.\n\n' +
  'To‘plamda oldindan kesilgan 8 ta qism bor — tugmalar, yon tomonlar va orqa qism uchun. Shakli universal: yopishtirishdan oldin qismlarni sichqonchangizga qo‘yib ko‘ring, kerak bo‘lsa qaychi bilan moslang.\n\n' +
  'O‘rnatish: yuzani spirtli salfetka bilan artib quriting, stikerni markazdan chetga qarab tekislab bosing. Egri joylarni fen bilan 10–15 soniya isitib, bosib chiqing.';

const gripFeatures = (design, uzumName) =>
  `Dizayn: ${design}\nTo‘plamda: 8 ta qism\nYuzasi: romb naqshli, sirpanishga qarshi\nMos keladi: simli va simsiz sichqonchalar\nUzum’dagi rang nomi: ${uzumName}`;

// ---- Tovarlar (ro'yxat tartibi = saytdagi tartib) -------------------------------

export const CATALOG_PRODUCTS = [
  {
    category: 'gilamchalar', name: 'ARCANE Zero FX gilamcha — qizil, 450×400 mm',
    tagline: '6 mm qalin, silliq mato, tikilmagan qirralar',
    price: 229000, old_price: 299000, badge_new: 1, featured: 1,
    uzum_url: sku(ARCANE, 13469361), description: ARCANE_TEXT, features: arcaneFeatures('qizil'),
    media: ['arcane-qizil'],
  },
  {
    category: 'switchlar', name: 'Ko‘k switchlar — Clicky, 30 dona',
    tagline: 'Har bosishda aniq «klik»: ko‘p yozadiganlar uchun',
    price: 114000, old_price: 120000, badge_new: 1,
    uzum_url: sku(SWITCHES, 13450000),
    description: `Ko‘k (Blue) — clicky switch: har bosishda aniq «klik» ovozi va sezgisi bor. Klassik mexanik klaviatura hissini yoqtiradiganlar va ko‘p yozadiganlar uchun.\n\n${SWITCH_TEXT}`,
    features: switchFeatures('Clicky', 'o‘rtacha', 'baland klik'),
    media: ['switch-kok'],
  },
  {
    category: 'glaydlar', name: 'Razer Viper V4 Pro uchun glaydlar to‘plami',
    tagline: MODEL_GLIDES_TAGLINE,
    price: 99000, badge_new: 1,
    uzum_url: sku(GLIDES, 13608194),
    description: `Razer Viper V4 Pro’ning zavod oyoqchalari o‘rniga — aynan shu model shaklida kesilgan PTFE glaydlar. Eskirgan oyoqchalarni almashtirsangiz, sichqoncha yana yengil va bir tekis sirpanadi.\n\nTo‘plam faqat Razer Viper V4 Pro uchun. Buyurtma berishdan oldin sichqonchangiz modelini tekshiring.\n\n${MODEL_GLIDES_HOWTO}`,
    features: 'Mos model: Razer Viper V4 Pro\nMaterial: PTFE (teflon)\nTo‘plamda: old qism, orqa qism, sensor halqasi\nO‘rnatish: yopishqoq asos\nUzum’dagi rang nomi: Qaymoq rang',
    media: ['kit-viper-v4'],
  },
  {
    category: 'grip', name: 'Grip stiker — KDA, oq',
    tagline: GRIP_TAGLINE,
    price: 69000, old_price: 89000, badge_new: 1,
    uzum_url: sku(GRIP, 13261736), description: GRIP_TEXT, features: gripFeatures('KDA, oq', 'Feruza'),
    media: ['grip-kda-oq'],
  },
  {
    category: 'gilamchalar', name: 'ARCANE Zero FX gilamcha — qora, 450×400 mm',
    tagline: '6 mm qalin, silliq mato, tikilmagan qirralar',
    price: 229000, old_price: 299000, badge_new: 1,
    uzum_url: sku(ARCANE, 13469362), description: ARCANE_TEXT, features: arcaneFeatures('qora'),
    media: ['arcane-qora'],
  },
  {
    category: 'switchlar', name: 'Qizil switchlar — Linear, 30 dona',
    tagline: 'To‘siqsiz, silliq va jim: o‘yin va tez bosish uchun',
    price: 114000, old_price: 120000, badge_new: 1,
    uzum_url: sku(SWITCHES, 13450004),
    description: `Qizil (Red) — linear switch: to‘siqsiz, silliq yuradi va deyarli ovoz chiqarmaydi. Yengil bosiladi — FPS, MOBA va tez reaksiya kerak bo‘lgan o‘yinlar uchun.\n\n${SWITCH_TEXT}`,
    features: switchFeatures('Linear', 'yengil', 'jim'),
    media: ['switch-qizil'],
  },
  {
    category: 'glaydlar', name: 'Universal teflon glaydlar — qora, 20 dona',
    tagline: 'Yumaloq PTFE oyoqchalar: sichqoncha yangidek sirpanadi',
    price: 59000, old_price: 99000, badge_hit: 1,
    uzum_url: sku(GLIDES, 11939543), description: DOT_GLIDES_TEXT, features: dotGlides('qora'),
    media: ['glides-qora'],
  },
  {
    category: 'grip', name: 'Grip stiker — KDA, qora',
    tagline: GRIP_TAGLINE,
    price: 69000, old_price: 89000, badge_new: 1,
    uzum_url: sku(GRIP, 13261735), description: GRIP_TEXT, features: gripFeatures('KDA, qora', 'Moviy'),
    media: ['grip-kda-qora'],
  },
  {
    category: 'switchlar', name: 'Jigarrang switchlar — Tactile, 30 dona',
    tagline: 'Yengil «bump», klik ovozisiz: yozish va o‘yin uchun',
    price: 114000, old_price: 120000, badge_new: 1,
    uzum_url: sku(SWITCHES, 13449997),
    description: `Jigarrang (Brown) — tactile switch: bosganda yengil «bump» seziladi, lekin klik ovozi yo‘q. Yozish va o‘yin uchun birdek qulay — birinchi mexanik klaviatura uchun yaxshi tanlov.\n\n${SWITCH_TEXT}`,
    features: switchFeatures('Tactile', 'o‘rtacha', 'past'),
    media: ['switch-jigarrang'],
  },
  {
    category: 'grip', name: 'Grip stiker — Printstream',
    tagline: GRIP_TAGLINE,
    price: 69000, old_price: 89000, badge_new: 1,
    uzum_url: sku(GRIP, 13261734), description: GRIP_TEXT, features: gripFeatures('Printstream', 'Kulrang'),
    media: ['grip-printstream'],
  },
  {
    category: 'glaydlar', name: 'Razer DeathAdder V3 Pro uchun glaydlar to‘plami',
    tagline: MODEL_GLIDES_TAGLINE,
    price: 99000, badge_new: 1,
    uzum_url: sku(GLIDES, 13608192),
    description: `Razer DeathAdder V3 Pro uchun to‘liq to‘plam: ikkita old qism, orqa qism va sensor halqasi. Model shaklida kesilgan PTFE glaydlar sichqonchani yana yengil va bir tekis yuritadi.\n\nDiqqat: DeathAdder V3 (simli), V2 Pro va boshqa modellarga mos kelmaydi.\n\n${MODEL_GLIDES_HOWTO}`,
    features: 'Mos model: Razer DeathAdder V3 Pro\nMos emas: DeathAdder V3 (simli), V2 Pro\nMaterial: PTFE (teflon)\nQalinligi: ≈ 0,8–1,0 mm\nTo‘plamda: 2 ta old qism, orqa qism, sensor halqasi\nUzum’dagi rang nomi: Fil suyagi',
    media: ['kit-deathadder'],
  },
  {
    category: 'switchlar', name: 'Qora switchlar — Linear, og‘ir, 30 dona',
    tagline: 'Silliq, lekin og‘irroq bosiladi: tasodifiy bosishlar kamayadi',
    price: 114000, old_price: 120000, badge_new: 1,
    uzum_url: sku(SWITCHES, 13449998),
    description: `Qora (Black) — og‘ir linear switch: silliq yuradi, lekin bosish uchun ko‘proq kuch kerak. Barmoq tugmaga tegib ketganda tasodifiy bosilmaydi — aniq va ishonchli bosishni yoqtiradiganlar uchun.\n\n${SWITCH_TEXT}`,
    features: switchFeatures('Linear', 'og‘ir', 'jim'),
    media: ['switch-qora'],
  },
  {
    category: 'grip', name: 'Grip stiker — qora',
    tagline: GRIP_TAGLINE,
    price: 69000, old_price: 89000, badge_hit: 1,
    uzum_url: sku(GRIP, 12786133), description: GRIP_TEXT, features: gripFeatures('qora', 'Qora'),
    media: ['grip-qora'],
  },
  {
    category: 'glaydlar', name: 'Universal teflon glaydlar — oq, 20 dona',
    tagline: 'Yumaloq PTFE oyoqchalar: sichqoncha yangidek sirpanadi',
    price: 59000, old_price: 99000, badge_hit: 1,
    uzum_url: sku(GLIDES, 11939542), description: DOT_GLIDES_TEXT, features: dotGlides('oq'),
    media: ['glides-oq'],
  },
  {
    category: 'grip', name: 'Grip stiker — oq',
    tagline: GRIP_TAGLINE,
    price: 69000, old_price: 89000, badge_hit: 1,
    uzum_url: sku(GRIP, 12786132), description: GRIP_TEXT, features: gripFeatures('oq', 'Oq'),
    media: ['grip-oq'],
  },
  {
    category: 'glaydlar', name: 'Logitech G Pro X Superlight uchun glaydlar (1-avlod)',
    tagline: MODEL_GLIDES_TAGLINE,
    price: 99000, badge_new: 1,
    uzum_url: sku(GLIDES, 13608193),
    description: `Logitech G Pro X Superlight (1-avlod, 2020) uchun to‘liq to‘plam: old qism, orqa qism, qopqoq va sensor halqasi. Model shaklida kesilgan, 3M yelim mahkam ushlaydi va iz qoldirmaydi.\n\nDiqqat: Superlight 2 va Superstrike modellariga mos kelmaydi — ular uchun alohida to‘plam bor.\n\n${MODEL_GLIDES_HOWTO}`,
    features: 'Mos model: Logitech G Pro X Superlight (1-avlod, 2020)\nMos emas: Superlight 2, Superstrike\nMaterial: PTFE (teflon)\nYelim: 3M\nTo‘plamda: old qism, orqa qism, qopqoq, sensor halqasi\nUzum’dagi rang nomi: Muz',
    media: ['kit-gpx'],
  },
  {
    category: 'glaydlar', name: 'Logitech G Pro X Superlight 2 / Superstrike uchun glaydlar',
    tagline: MODEL_GLIDES_TAGLINE,
    price: 99000, badge_new: 1,
    uzum_url: sku(GLIDES, 13608195),
    description: `Logitech G Pro X Superlight 2 va Pro X2 Superstrike uchun to‘liq to‘plam: old qism, orqa qism, qopqoq va sensor halqasi. Model shaklida kesilgan, 3M yelim mahkam ushlaydi va iz qoldirmaydi.\n\nDiqqat: Superlight (1-avlod), Superlight 2 DEX va 2c modellariga mos kelmaydi.\n\n${MODEL_GLIDES_HOWTO}`,
    features: 'Mos modellar: Logitech G Pro X Superlight 2, Pro X2 Superstrike\nMos emas: Superlight (1-avlod), Superlight 2 DEX, 2c\nMaterial: PTFE (teflon)\nYelim: 3M\nTo‘plamda: old qism, orqa qism, qopqoq, sensor halqasi\nUzum’dagi rang nomi: Oqish rang',
    media: ['kit-gpx2'],
  },
];

// ---- Hero slaydlar -----------------------------------------------------------
// Rasm yuklanmagan slayd bog'langan tovar yoki kategoriyaning rasmlarini 3D to'plam qilib ko'rsatadi.
// product: bog'langan tovarning Uzum havolasi (slayd o'sha tovar rasmlarini oladi).

export const CATALOG_SLIDES = [
  {
    brand: 'lootbox', kicker: 'Xit tovar', title: 'Silliq sirpanish. Aniq nishon.',
    subtitle: 'Teflon glaydlar: sichqoncha gilamcha ustida yangidek yuradi.',
    cta_label: 'Glaydlarni ko‘rish', link_type: 'category', category: 'glaydlar', art: 'skates', tone: 'pink',
  },
  {
    brand: 'lootbox', kicker: 'Yangi kelgan', title: 'Har bosishda — his.',
    subtitle: 'Linear, Tactile yoki Clicky: hot-swap switchlar bilan klaviaturani lehimsiz o‘zingizga moslang.',
    cta_label: 'Switchlarni tanlash', link_type: 'category', category: 'switchlar', art: 'switch', tone: 'cyan',
  },
  {
    brand: 'lootbox', kicker: 'ARCANE Zero FX', title: 'Keng maydon. To‘liq nazorat.',
    subtitle: '450×400 mm, 6 mm qalin gilamcha: sichqonchaga erkin joy, bilakka yumshoq tayanch.',
    cta_label: 'Gilamchani ko‘rish', link_type: 'product', product: sku(ARCANE, 13469361), art: 'mousepad', tone: 'orange',
  },
  {
    // Sarlavhada qisqa so'zlar: hero'da matn ustuni tor, uzun so'z o'rtasidan bo'linib ketadi
    brand: 'lootbox', kicker: 'Grip stiker', title: 'Qo‘lda mahkam. O‘yinda aniq.',
    subtitle: 'Romb naqshli grip stikerlar: qo‘l terlasa ham sichqoncha sirpanmaydi. 5 xil dizayn.',
    cta_label: 'Dizaynlarni ko‘rish', link_type: 'category', category: 'grip', art: 'grip', tone: 'violet',
  },
];
