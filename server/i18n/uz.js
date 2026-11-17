// Saytdagi barcha matnlar (o'zbekcha). Rus tilini qo'shish uchun shu faylni ru.js nomi
// bilan nusxalab tarjima qiling va i18n/index.js dagi LOCALES ro'yxatiga qo'shing.
export default {
  lang: 'uz',
  currency: 'so‘m',

  nav: {
    catalog: 'Katalog',
    categories: 'Kategoriyalar',
    newIn: 'Yangi kelganlar',
    hits: 'Xit tovarlar',
    menu: 'Menyu',
    close: 'Yopish',
    home: 'Bosh sahifa',
    skip: 'Asosiy qismga o‘tish',
    switchTo: 'Bo‘limga o‘tish',
    allProducts: 'Barcha tovarlar',
  },

  brand: {
    lootbox: { name: 'LOOTBOX', line: 'Texnika va gaming aksessuarlari' },
    fit: { name: 'LOOTBOX FIT', line: 'Kundalik hayot va sport uchun' },
  },

  hero: {
    label: 'Asosiy takliflar',
    prev: 'Oldingi slayd',
    next: 'Keyingi slayd',
    slide: 'Slayd',
    scroll: 'Pastga',
    catalog: 'Butun katalog',
    fallbackCta: 'Ko‘rish',
  },

  home: {
    newTitle: 'Yangi kelganlar',
    newKicker: 'Yangi',
    hitTitle: 'Eng ko‘p olinadiganlar',
    hitKicker: 'Xit',
    allTitle: 'Katalogdan',
    allKicker: 'Katalog',
    categoriesTitle: 'Nima qidiryapsiz?',
    categoriesKicker: 'Kategoriyalar',
    spotlightKicker: 'Tanlov',
    aboutKicker: 'Brend haqida',
    seeAll: 'Hammasini ko‘rish',
    fitBandKicker: 'Yangi bo‘lim',
    fitBandTitle: 'LOOTBOX FIT — kiyimlar',
    fitBandText: 'Futbolka, xudi va joggerlar. Xuddi shu LOOTBOX, faqat endi garderobda.',
    fitBandCta: 'FIT bo‘limiga o‘tish',
    lootBandKicker: 'Asosiy bo‘lim',
    lootBandTitle: 'LOOTBOX — setup aksessuarlari',
    lootBandText: 'Glaydlar, switchlar, gilamchalar va grip stikerlar.',
    lootBandCta: 'LOOTBOX bo‘limiga o‘tish',
    channelKicker: 'Telegram',
    channelTitle: 'Yangi tovarlar birinchi bo‘lib kanalda',
    channelText: 'Yangi kelgan tovarlar, chegirmalar va setup g‘oyalari — Telegram kanalimizda.',
    channelCta: 'Kanalga o‘tish',
    pillarUzum: 'Uzum Market orqali xarid',
    pillarUzumText: 'Buyurtma va yetkazib berish Uzum Market orqali — o‘zingizga qulay topshirish punktiga.',
    pillarChannel: 'Yangiliklar kanalda',
    pillarChannelText: 'Yangi kelgan tovarlar va chegirmalar haqida Telegram kanalda xabar beramiz.',
    pillarDm: 'Savolga javob beramiz',
    pillarDmText: 'Tanlashda ikkilansangiz — lichkaga yozing, mos variantni aytamiz.',
    emptyTitle: 'Tovarlar tez orada',
    emptyText: 'Bu bo‘lim hozir to‘ldirilmoqda. Tovarlar tez orada shu yerda paydo bo‘ladi.',
  },

  catalog: {
    title: 'Katalog',
    all: 'Hammasi',
    count: (n) => `${n} ta tovar`,
    sort: 'Saralash',
    sortDefault: 'Tavsiya etilgan',
    sortNew: 'Avval yangilari',
    sortPriceAsc: 'Avval arzonlari',
    sortPriceDesc: 'Avval qimmatlari',
    emptyTitle: 'Bu yerda hozircha tovar yo‘q',
    emptyText: 'Tovarlar tez orada qo‘shiladi.',
    backToAll: 'Butun katalog',
  },

  product: {
    new: 'Yangi',
    hit: 'Xit',
    sale: 'Chegirma',
    code: 'Kod',
    description: 'Tavsif',
    features: 'Xususiyatlar',
    related: 'Sizga yoqishi mumkin',
    relatedKicker: 'Yana',
    gallery: 'Tovar rasmlari',
    photo: (n, total) => `${n}-rasm, jami ${total} ta`,
    zoom: 'Rasmni kattalashtirish',
    noPhoto: 'Rasm tez orada qo‘shiladi',
    priceOnRequest: 'Narxi so‘rov bo‘yicha',
    soon: 'Tez orada sotuvda',
    share: 'Ulashish',
    copied: 'Havola nusxalandi',
    details: 'Batafsil',
    opensNewTab: 'yangi oynada ochiladi',
  },

  // Tugma matnlari: tovar qayerga olib borishiga qarab
  dest: {
    uzum: { cta: 'Uzum’da xarid qilish', short: 'Uzum', hint: 'Buyurtma Uzum Market’da rasmiylashtiriladi' },
    channel: { cta: 'Telegram kanalda ko‘rish', short: 'Kanal', hint: 'Tovar haqida Telegram kanalimizda' },
    dm: { cta: 'Telegramda yozish', short: 'Yozish', hint: 'Sotuvchiga lichkaga yozasiz' },
    otherUzum: 'Uzum’da ochish',
    otherChannel: 'Telegram kanal',
    otherDm: 'Savol berish',
  },

  footer: {
    brands: 'Bo‘limlar',
    catalog: 'Katalog',
    contact: 'Aloqa',
    uzumShop: 'Uzum’dagi do‘kon',
    channel: 'Telegram kanal',
    dm: 'Telegramda yozish',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    rights: 'Barcha huquqlar himoyalangan.',
    top: 'Yuqoriga',
  },

  notFound: {
    title: 'Sahifa topilmadi',
    text: 'Bu manzilda hech narsa yo‘q. Havola eskirgan yoki tovar olib tashlangan bo‘lishi mumkin.',
    home: 'Bosh sahifaga',
    catalog: 'Katalogga',
  },

  // Qidiruv tizimlari uchun matnlar (server/site/seo.js shulardan sahifa sarlavhasi va tavsifini tuzadi).
  // groups — tovar turlari: tur kategoriya yoki tovar nomidan taniladi. Har biri uchun:
  //   terms — odamlar shu narsani qanday nomlar bilan qidirishi (sahifada «Boshqa nomlari» qatorida ko'rinadi;
  //           eng ko'p ishlatiladigani oldinda: so'zlashuvdagi o'zbekcha, inglizcha, ruscha);
  //   more  — faqat qidiruv tizimlariga beriladigan qo'shimcha yozilishlar;
  //   item  — tovar sahifasi sarlavhasiga qo'shiladigan ibora;  short — kategoriya sarlavhasidagi qavs ichi;
  //   ru    — tavsif oxiriga qo'shiladigan ruscha nom;  intro — kategoriya sahifasidagi kirish matni.
  // Admin panelda tovar yoki kategoriyaga o'z «qidiruv so'zlari» yozilsa, shu ro'yxat o'rniga o'sha ishlatiladi.
  seo: {
    also: 'Boshqa nomlari',
    price: (amount) => `Narxi ${amount} so‘m`,
    priceFrom: (amount) => `narxi ${amount} so‘mdan`,
    kinds: (n) => `${n} xil tovar`,
    viaUzum: 'O‘zbekiston bo‘ylab Uzum Market orqali yetkazib beriladi',
    prices: 'narxlari',
    catalogOf: (brand) => `${brand} katalogi`,
    groups: {
      skates: {
        terms: ['skeytlar', 'mouse skates', 'скейты для мыши', 'глайды для мыши', 'sichqoncha oyoqchalari'],
        more: ['skeyt', 'skate', 'glides', 'PTFE feet', 'тефлоновые ножки для мыши', 'сичқонча скейти'],
        item: 'sichqoncha skeytlari',
        short: 'skeytlar, mouse skates',
        ru: 'Скейты (глайды) для мыши',
        intro:
          'Glayd (skeyt, inglizcha mouse skates) — sichqoncha tagiga yopishtiriladigan teflon (PTFE) oyoqcha. Yeyilgan zavod oyoqchalarini almashtirsangiz, sichqoncha gilamcha ustida yana yengil va bir tekis sirpanadi. Logitech va Razer modellari uchun tayyor to‘plamlar hamda istalgan sichqonchaga mos universal nuqta-glaydlar bor.',
      },
      switches: {
        terms: ['svitchlar', 'keyboard switches', 'свитчи для клавиатуры', 'переключатели для механической клавиатуры', 'mexanik klaviatura svitchlari'],
        more: ['svitch', 'switch', 'linear', 'tactile', 'clicky', 'hot-swap', 'свитчи', 'клавиатура свитчлари'],
        item: 'mexanik klaviatura svitchlari',
        short: 'svitchlar, keyboard switches',
        ru: 'Свитчи (переключатели) для механической клавиатуры',
        intro:
          'Switch (svitch) — mexanik klaviaturada har bir tugma ostidagi mexanizm: bosish hissi va ovozi shunga bog‘liq. Linear switchlar silliq va jim, tactile — yengil «bump» bilan, clicky — aniq «klik» ovozi bilan bosiladi. Hot-swap klaviaturada ular lehimsiz almashtiriladi.',
      },
      pads: {
        terms: ['kovrik', 'mousepad', 'коврик для мыши', 'игровой коврик', 'sichqoncha gilamchasi'],
        more: ['kovriklar', 'mouse pad', 'gaming kovrik', 'коврик для мышки', 'сичқонча гиламчаси'],
        item: 'kovrik (mousepad)',
        short: 'kovriklar, mousepad',
        ru: 'Игровой коврик для мыши',
        intro:
          'Gilamcha (kovrik, mousepad) — sichqoncha uchun to‘shama: sensor aniqroq ishlaydi, sichqoncha bir tekis sirpanadi, bilak esa charchamaydi. O‘yin uchun keng maydonli, qalin va qirralari tikilmagan gilamchalar.',
      },
      grips: {
        terms: ['grip lenta', 'grip tape', 'грипсы для мыши', 'грип-лента', 'sichqoncha stikeri'],
        more: ['grip', 'grips', 'antislip stiker', 'наклейки на мышь', 'грип стикер'],
        item: 'sichqoncha uchun grip lenta',
        short: 'grip lenta, grip tape',
        ru: 'Грипсы (грип-лента) для мыши',
        intro:
          'Grip stiker (grip lenta) — sichqoncha yuzasiga yopishtiriladigan, sirpanishga qarshi qoplama. Qo‘l terlaganda ham sichqoncha kaftdan sirpanmaydi, korpus esa tirnalishdan saqlanadi. Bir necha xil dizayn bor.',
      },
    },
  },

  cursor: { drag: 'Suring' },

  // Faqat admin panelga kirgan odamga ko'rinadi
  admin: { panel: 'Admin panel', editProduct: 'Tovarni tahrirlash' },
};
