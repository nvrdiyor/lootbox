// Tovar rasmlari ta'riflari: saytdagi har bir fonsiz rasm QAYERDAN olingani va QANDAY kesilgani.
// Ishga tushirish:  npm run cutouts                 — hammasini qaytadan yasaydi (server/db/catalog-media/)
//                   npm run cutouts -- nom ...       — faqat ko'rsatilganlarini
//                   npm run cutouts -- --check nom   — yozmaydi; data/shots/ ga to'q fondagi ko'rinishini va
//                                                      (konturli ta'rifda) chekka tekshiruv tasmasini chiqaradi
// Keyin bazaga yozish:  npm run catalog -- --replace-images
//
// MANBA (source):
//   web(rasm manzili, topilgan sahifa) — internetdan olingan mahsulot surati (oq fonli). Bu begona sotuvchi yoki
//       ishlab chiqaruvchining rasmi: undan foydalanish huquqi do'kon egasining zimmasida. O'z suratingiz bo'lsa,
//       admin paneldan yuklang yoki shu yerda manbani almashtiring.
//   'identifikator' — Uzum'dagi o'z e'lonimiz rasmi (images.uzum.uz/<id>/original.jpg).
//
// USUL: `outline` berilmasa — oq fon usuli (CUT.white), berilsa — kontur usuli (CUT.outline); `render: 'pad'` —
// gilamcha kesilmaydi, qayta chiziladi (CUT.pad). Koordinatalar har doim asl rasm piksellarida.
//
// Oq fon usuli:
//   T            fon rangidan qancha farq qilsa ham "fon" hisoblanadi (odatda 12; yumshoq soyani olib tashlash uchun kattaroq)
//   crop         [x, y, eni, bo'yi] — rasmning faqat shu bo'lagi olinadi
//   scale        kesishdan oldin kattalashtirish (kichik rasmlar uchun)
//   close        to'siqdagi shu radiusdan tor yoriqlar berkitiladi (fon tovar ichiga sizib kirmasin)
//   holes        'auto' — tovar ichidagi yopiq fon orollari ham olib tashlanadi (halqa teshigi)
//   keepLargest  eng katta N ta bo'lak qoladi (yonidagi boshqa buyumlar, yozuvlar tashlanadi)
//   minArea      bundan kichik bo'laklar (chang, shovqin) tashlanadi
//   drop         [[ [x,y], ... ]] — shu ko'pburchaklar ichi majburan fon
//   patches      [{ poly, dir }] — ko'pburchak ichi `dir` yo'nalishi bo'ylab ikki chetidagi ranglar bilan to'ldiriladi
//   circles      'same' — har bir bo'lak bir xil radiusli aniq doira bilan almashtiriladi (nuqta-glaydlar)
//
// Kontur usuli:
//   outline      [[x, y, bayroq?, siljish?], ...] — soat mili bo'yicha yopiq egri. Bayroq:
//                  yo'q yoki 'd' — nuqta taxminiy (tashqariroqda): chekka mahalliy fon rangidan birinchi farq bo'yicha topiladi;
//                  'g' — birinchi keskin o'tish bo'yicha (yumshoq soya o'tkazib yuboriladi);
//                  'r' — to'q fondan yorug' buyumga birinchi keskin yorishish bo'yicha ('f' — aksincha, qorayish bo'yicha);
//                  1   — nuqta aniq: chiziq shu yerdan o'tadi (chekka ko'rinmaydigan yoki adashtiradigan joylar).
//                siljish — nuqtani normal bo'ylab suradi (+ tashqariga, − ichkariga), piksel.
//   snapMode     'grad' — bayroqsiz nuqtalar 'g' kabi ishlanadi (aks holda 'd' kabi)
//   snapOut/snapIn  chekka chiziqdan necha piksel tashqaridan boshlab va necha piksel ichkarigacha qidiriladi
//   snapThr/riseThr 'd','g' va 'r' uchun sezgirlik; snapLevels — qidirishdan oldin yorqinlikni cho'zish (qorong'i plakat)
//   snapMedian/snapMean  topilgan chekkani silliqlash (nuqtalar soni)
//   coarse       [[dan, gacha], ...] — shu tartib raqamli nuqtalar orasida chekka har nuqtada bir marta o'lchanadi
//                (chekka deyarli ko'rinmaydigan joyda chiziq to'lqinlanmasin: qora buyum to'q fonda)
//   inset        kesish chizig'i chekkadan shuncha piksel ichkarida o'tadi
//   desat        [{ hue: [dan, gacha], amount }] — fon yorug'ligidan qolgan rangli tusni yo'qotadi (hue berilmasa — hammasi)
//   strip…       tekshiruv tasmasi sozlamalari (--check): stripRange, stripRows, stripLevels
//
// Qayta chizish (render: 'pad'):
//   size         [eni, bo'yi, qalinligi] — gilamcha o'lchami, mm;  radius — burchak radiusi, mm
//   view         [[x, y] × 4] — gilamcha qaysi burchakdan ko'rinishi: namuna rasmdagi to'rt burchagi
//                (chap-yuqori, o'ng-yuqori, o'ng-past, chap-past); kamera shundan tiklanadi
//   color        mato rangi [r, g, b];  logoColor — logotip rangi;  foam — yon tomondagi ko'pik asos rangi
//   logo         { points, box } — logotip manba suratdan ko'chiriladi: points — [surat x, y, gilamchadagi u, v (mm)]
//                tayanch nuqtalari (kamida 4 ta), box — logotip egallagan joy [u0, v0, u1, v1], mm
//   shade        { grain, weave, cloud, light, lightDir, sheen, rim } — mato doni va yorug'lik (odatda kerak emas)
//   width        natija kengligi, piksel (odatda 1400)
//
// Hamma usul uchun:
//   quality      [to'liq, kichik] — WebP sifati (odatda 0.9 va 0.86). Bir tekis to'q sirtli rasmda (gilamcha) odatdagi
//                siqish kvadrat dog'lar qoldiradi — unga yuqoriroq sifat beriladi.
//
// Tekshiruv tasmasi (--check) kesish chizig'i bo'ylab "yoyilgan" rasm: o'rtadagi chiziq — kesim, tepasi — tashqari,
// pasti — ichkari. Buyum cheti chiziqdan qancha yuqori yoki pastda ko'rinsa, o'sha nuqtaga shuncha siljish beriladi.

const web = (url, page) => ({ url, page });

// Gilamcha kesilmaydi, qayta chiziladi (CUT.pad). Internetda faqat asl brend (boshqa logotipli) rasmlari bor, Uzum’dagi
// plakatimizdan kesilgan bo‘lak esa xira va dog‘li chiqdi — do‘kon egasi uni rad etdi. Gilamcha tekis buyum: o‘z o‘lchami
// (450 × 400 × 6 mm), plakatdagi ko‘rinish burchagi (view — birinchi plakatdagi gilamchaning to‘rt burchagi) va egasining
// haqiqiy suratidan ko‘chirilgan logotip bilan toza chiziladi. Manba — o‘sha haqiqiy surat (e’londagi «REAL FOTO»).
// logo.points: [suratdagi x, y, gilamchadagi u, v (mm)] — logotipning tayanch nuqtalari; u, v tepadan ko‘rinishdagi
// plakatdan (ikkinchi rasm) o‘lchangan.
const PAD = {
  render: 'pad',
  quality: [0.99, 0.98],
  size: [450, 400, 6],
  radius: 15.5,
  view: [[161.1, 971.8], [963.8, 770.5], [1334.6, 1257.6], [401.4, 1545.7]],
  logo: {
    box: [356, 371, 438, 392],
    points: [
      [108, 952, 359.8, 381.1], // strelka uchi
      [356, 840, 378.4, 374.2], // strelkaning yuqori qanoti
      [328, 1000.8, 376.3, 386.1], // strelkaning pastki qanoti
      [388, 882, 380.7, 377.4], // birinchi «A» ning uchi
      [340, 974, 377.4, 383.8], // birinchi «A» ning chap oyog‘i
      [814.8, 850, 415.2, 377], // «E» ustunining tepasi
      [816, 933.2, 415.2, 383.7], // «E» ustunining pasti
      [590, 1016, 396, 388.8], // pastki yozuvning boshi
      [1080, 976.8, 434.3, 388.8], // pastki yozuvning oxiri
    ],
  },
};

// Oq va qora grip stiker konturi. Oq plakatda (oq sichqoncha to‘q fonda) chekka avtomatik topilgan ('r' usuli, ikki
// o‘tishda: «STIKER» yozuvi sichqonchaga yaqin kelgan joyda qidiruv oralig‘i toraytirilgan), so‘ng aniq nuqtalarga
// aylantirilgan: qora plakatda qora sichqoncha to‘q fonda ko‘rinmaydi, joylashuvi esa oq plakatdagi bilan bir xil.
const GRIP_OUTLINE = [
  [42.5, 891.1, 1], [41.5, 886.4, 1], [41.2, 882.2, 1], [41.1, 874.6, 1], [41.7, 868.6, 1], [42.6, 864.7, 1],
  [49.5, 843.3, 1], [56.4, 827.3, 1], [67.4, 802.3, 1], [79.2, 778.3, 1], [91.9, 754.8, 1], [104.8, 731.3, 1],
  [115.8, 713.6, 1], [130, 691.3, 1], [142.2, 671.9, 1], [156.8, 650.4, 1], [167.8, 634, 1], [183.7, 611.9, 1],
  [199.5, 589.6, 1], [215.4, 567.4, 1], [227.1, 552.2, 1], [242, 532.9, 1], [259, 512, 1], [268, 502, 1],
  [285.7, 482.1, 1], [302.3, 463.9, 1], [318.4, 447.6, 1], [336.7, 430.2, 1], [353.6, 414.4, 1], [373.5, 396.6, 1],
  [389.1, 382.5, 1], [405.8, 367.8, 1], [422.5, 353.9, 1], [432, 346.8, 1], [439.9, 340.1, 1], [444.7, 336.6, 1],
  [453.8, 330.8, 1], [460.6, 325.1, 1], [467.7, 320.6, 1], [486.8, 308.3, 1], [507.9, 295.8, 1], [523.7, 287.9, 1],
  [546.4, 277, 1], [565.3, 269.3, 1], [590.3, 260.2, 1], [616.3, 252.3, 1], [629.6, 249.1, 1], [656.6, 244.2, 1],
  [677.7, 240.8, 1], [696.5, 239.3, 1], [722.5, 239.1, 1], [748.7, 240.4, 1], [767.2, 242.3, 1], [782.5, 244.3, 1],
  [807.8, 250.7, 1], [834, 258.8, 1], [849.4, 264.8, 1], [874.4, 275.6, 1], [891.9, 284.9, 1], [914.1, 299, 1],
  [926.2, 308.1, 1], [941.8, 319.9, 1], [949.8, 327.2, 1], [969.1, 346.4, 1], [979.3, 357.3, 1], [991.6, 373.5, 1],
  [1005.5, 395.2, 1], [1017.5, 416, 1], [1025.8, 433.6, 1], [1035.2, 458.4, 1], [1042.3, 482.3, 1], [1046.5, 500.6, 1],
  [1051.3, 520.9, 1], [1052.5, 528.2, 1], [1052.8, 537.1, 1], [1052.9, 558.6, 1], [1051, 576.8, 1], [1047.4, 596.1, 1],
  [1043.8, 611.1, 1], [1039.4, 624.1, 1], [1032.3, 640.9, 1], [1022.5, 659, 1], [1016.8, 667.7, 1], [1002.8, 686.5, 1],
  [994.9, 695.6, 1], [981.3, 708.9, 1], [971.9, 717.6, 1], [965.5, 724.2, 1], [961.4, 727.2, 1], [949.4, 736.7, 1],
  [929.2, 753, 1], [913, 765.7, 1], [905.3, 772.8, 1], [900.8, 776.1, 1], [888.1, 786.2, 1], [880.5, 793.4, 1],
  [867, 806.6, 1], [853.7, 820.9, 1], [840.8, 837.2, 1], [824.9, 858.8, 1], [810.3, 881.2, 1], [798.2, 901.3, 1],
  [784.1, 924.2, 1], [772.7, 943.7, 1], [758.2, 966.6, 1], [743.7, 988.6, 1], [729.7, 1008.8, 1], [715.9, 1027.3, 1],
  [704.2, 1041.8, 1], [692.4, 1055.8, 1], [675.5, 1073.6, 1], [665.2, 1082.4, 1], [654.7, 1091.1, 1], [644.4, 1098.2, 1],
  [626.8, 1107.5, 1], [610.1, 1115.3, 1], [597.6, 1119.4, 1], [576.6, 1124.3, 1], [558.7, 1127.1, 1], [532.3, 1129.5, 1],
  [505.4, 1130.1, 1], [484.9, 1129.3, 1], [466.3, 1128.2, 1], [439, 1125.7, 1], [411.9, 1122.1, 1], [385.9, 1118.1, 1],
  [372.5, 1115, 1], [364, 1112.3, 1], [346.8, 1105.6, 1], [332.2, 1101.3, 1], [305.8, 1093.9, 1], [279.5, 1085.9, 1],
  [255.6, 1077.9, 1], [250.9, 1076.4, 1], [244.9, 1075.6, 1], [235.3, 1074.6, 1], [229.4, 1072.7, 1], [221.5, 1068.9, 1],
  [196.9, 1056.5, 1], [174.3, 1043.1, 1], [156.9, 1032.1, 1], [140, 1019.9, 1], [119.6, 1004, 1], [108.8, 994.1, 1],
  [102.4, 986.9, 1], [94.7, 978.3, 1], [83.7, 967.3, 1], [70.2, 950.1, 1], [63.5, 940.5, 1], [59.4, 932.7, 1],
  [55.3, 924.1, 1], [53.7, 918.8, 1], [51.3, 908.7, 1], [49.5, 904.4, 1], [44.6, 895.9, 1],
];

// Model-glaydlar: oq fonda oq buyum — fon chegarasi tor, ichidagi yopiq fon (sensor halqasi teshigi) ham olib tashlanadi
const FEETGLIDE = { T: 7, holes: 'auto', minContrast: 20 };

export const SPECS = {
  // Switchlar: bitta sotuvchining to‘rt rangdagi, bir xil burchakdan olingan suratlari (toza oq fon)
  'switch-kok': {
    source: web(
      'https://m.media-amazon.com/images/I/61S1x6KrQHL.jpg',
      'https://bahamas.desertcart.com/products/502451271-outemu-blue-switch-3-pin-switch-gateron-and-cherry-mx',
    ),
  },
  'switch-qizil': {
    source: web(
      'https://m.media-amazon.com/images/I/6168x4pbvbL.jpg',
      'https://snapklik.com/en-ca/product/outemu-red-switches-3-pin-switches-gateron-and-cherry-mx-equivalent-diy-replaceable-switches-for-mechanical-gaming-keyboard-36pcs-red/0PCX4PL7R2635',
    ),
  },
  'switch-jigarrang': {
    source: web(
      'https://m.media-amazon.com/images/I/61u+eB4hTeL.jpg',
      'https://www.desertcart.com.au/products/471402403-draoza-outemu-brown-switch-3-pin-switch-gateron-and-cherry',
    ),
  },
  'switch-qora': {
    source: web(
      'https://images-na.ssl-images-amazon.com/images/I/61c1FVPDGKL.jpg',
      'https://fado.vn/us/amazon/draoza-outemu-black-switch-3-pin-switch-gateron-and-cherry-mx-equivalent-diy-replaceable-switch-for-mechanical-gaming-keyboard-72pcs-black-B0B5G1KFJV.html',
    ),
  },

  // Gilamcha: qayta chiziladi (yuqoridagi PAD). Ikki rang faqat mato rangi bilan farq qiladi.
  'arcane-qizil': { source: 'dblnikf53nls73a0rfsg', ...PAD, color: [171, 41, 30] },
  'arcane-qora': { source: 'dblnikf53nls73a0rfsg', ...PAD, color: [26, 31, 41], logoColor: [226, 229, 236] },

  // Universal nuqta-glaydlar. Qorasi: varaqdagi 20 ta nuqtaning o‘zi (varaqda boshqa brend yozuvi bor) — aniq doiralar.
  // Oqi: 20 ta nuqta o‘z varag‘i bilan (rasm kichik, shuning uchun 2 barobar kattalashtiriladi).
  'glides-qora': {
    source: web(
      'https://m.media-amazon.com/images/I/81l3WnAM5OL._AC_SL1500_.jpg',
      'https://www.amazon.ca/Wallhack-Premium-Universal-Ultra-Smooth-Customize/dp/B0F448WRQ9',
    ),
    crop: [150, 560, 640, 530],
    scale: 1.6,
    T: 150,
    close: 3,
    minArea: 800,
    circles: 'same',
    circleInset: 3,
  },
  'glides-oq': {
    source: web(
      'https://down-id.img.susercontent.com/file/sg-11134201-7rasg-mb4wfo6zqjwwc1',
      'https://shopee.co.id/Spacepad-White-Dots-Universal-Gaming-Mouse-Feet-Mouse-Skate-PTFE-(Hybrid-Speed)-i.405815656.44354981685',
    ),
    crop: [296, 141, 468, 610],
    scale: 2,
    T: 34,
    close: 3,
    keepLargest: 1,
  },

  // Model-glaydlar: bitta ishlab chiqaruvchining to‘rt model uchun bir xil uslubdagi rasmlari (oq fonda oq buyum)
  'kit-viper-v4': {
    source: web(
      'https://feetglide.com/wp-content/uploads/2026/03/Razer-Viper-V4-Pro_1-1.jpg',
      'https://feetglide.com/shop/glides/feetglide-skates-for-razer-viper-v4-pro-fg-326/',
    ),
    ...FEETGLIDE,
  },
  'kit-gpx': {
    source: web(
      'https://feetglide.com/wp-content/uploads/2021/02/Logitech-G-Pro-X-Superlight-1.jpg',
      'https://feetglide.com/shop/glides/feetglide-skates-for-logitech-g-pro-x-superlight-fg-075/',
    ),
    ...FEETGLIDE,
  },
  'kit-gpx2': {
    source: web(
      'https://feetglide.com/wp-content/uploads/2023/09/Logitech-Pro-X-Superlight-2-1.jpg',
      'https://feetglide.com/shop/glides/feetglide-skates-for-logitech-g-pro-x-superlight-2-fg-191/',
    ),
    ...FEETGLIDE,
  },
  'kit-deathadder': {
    source: web(
      'https://feetglide.com/wp-content/uploads/2023/01/Razer-DeathAdder-V3-Pro-1.jpg',
      'https://feetglide.com/shop/glides/feetglide-skates-for-razer-deathadder-v3-pro-fg-163/',
    ),
    ...FEETGLIDE,
  },

  // Oq va qora grip stiker sichqonchasi bilan. Internetdagi toza suratlarda to‘plamning faqat bir qismi yopishtirilgan
  // (sichqonchaning o‘rtasi ochiq) — do‘kon egasi buni rad etdi: stiker sichqonchani to‘liq o‘raydi. To‘liq o‘ralgan
  // ko‘rinish Uzum’dagi o‘z plakatlarimizda bor, shuning uchun shulardan kontur bo‘yicha kesiladi. Ikkala plakatda
  // sichqoncha bir xil joylashgan — kontur bitta (GRIP_OUTLINE). Orqa tomondagi qizil yorug‘lik tusi olib tashlanadi.
  'grip-qora': {
    source: 'dauhakj4kamtgrh4i7tg',
    crop: [0, 180, 1086, 1020],
    snap: false,
    inset: 0,
    stripRows: 3,
    stripRange: 16,
    stripLevels: [0, 70],
    outline: GRIP_OUTLINE,
    desat: [{ hue: [300, 45], amount: 1, feather: 25 }],
  },
  'grip-oq': {
    source: 'dauhamr4kamtgrh4i7ug',
    crop: [0, 180, 1086, 1020],
    snap: false,
    inset: 0,
    stripRows: 3,
    stripRange: 16,
    outline: GRIP_OUTLINE,
    desat: [{ hue: [300, 45], amount: 1, feather: 25 }],
  },

  // KDA va Printstream: bu dizaynlarning toza fonli rasmi internetda topilmadi — bular ham Uzum’dagi o‘z
  // plakatlarimizdan, kontur bo‘yicha. Neon fondan qolgan rangli tus olib tashlanadi (desat).
  'grip-kda-oq': {
    source: 'dbehunrsr4js73fsgogg',
    crop: [120, 660, 1560, 1420],
    snapIn: 46,
    snapOut: 16,
    snapThr: 6,
    riseThr: 26,
    stripRows: 3,
    outline: [
      [195, 1080, 'r'], [215, 980, 'r'], [265, 900, 'r'], [340, 830, 'r'], [430, 780, 'r'], [530, 748, 'r'],
      [640, 735, 'r'], [750, 745, 'r'], [860, 775, 'r'], [960, 815, 'r'], [1060, 865, 'r'], [1160, 925, 'r'],
      [1260, 995, 'r'], [1350, 1075, 'r'], [1430, 1165, 'r'], [1500, 1265, 'r'], [1550, 1375, 'r'],
      [1580, 1490, 'r'], [1590, 1600, 'r'], [1580, 1710, 'r'], [1545, 1810, 'd'], [1490, 1890, 'd'],
      [1410, 1950, 'd'], [1320, 1985, 'd'], [1220, 2000, 'd'], [1160, 1994, 'd'], [1130, 1992, 'r'],
      [1100, 1980, 'r'], [1050, 1955, 'r'], [1000, 1925, 'r'], [950, 1885, 'r'], [900, 1842, 'r'],
      [850, 1795, 'r'], [800, 1745, 'r'], [750, 1687, 1, 0], [700, 1642, 1, -1], [650, 1597, 1, -1],
      [600, 1552, 1, -1], [550, 1507, 1, 0], [500, 1462, 1, 0], [450, 1418, 1, 1], [400, 1373, 1, 1],
      [350, 1328, 1, 0], [334, 1314, 1, -2], [318, 1300, 1, -2], [300, 1280, 1, -2], [274, 1250, 1, -2],
      [254, 1225, 1, -2], [237, 1200, 1, -2], [223, 1175, 1, -2], [212, 1150, 1, -2], [205, 1126, 1, -2],
    ],
    snapMedian: 45,
    snapMean: 15,
    desat: [{ hue: [285, 40], amount: 0.9, feather: 22 }],
  },
  'grip-kda-qora': {
    source: 'dbehu3f9upds73d7adtg',
    coarse: [[26, 40]],
    crop: [150, 960, 1520, 1180],
    stripRows: 3,
    stripLevels: [0, 100],
    snapLevels: [0, 120],
    snapThr: 22,
    snapOut: 16,
    snapIn: 34,
    snapMedian: 45,
    snapMean: 15,
    inset: 2,
    outline: [
      [225, 1400, 'd'], [235, 1330, 'd'], [262, 1262, 'd'], [300, 1200, 'd'], [345, 1150, 'd'],
      [400, 1105, 'd'], [455, 1075, 'd'], [520, 1040, 'd'], [600, 1022, 'd'], [680, 1015, 'd'],
      [760, 1020, 1, -13], [840, 1035, 1, -24], [920, 1058, 1, -25.5], [1000, 1090, 1, -26.5],
      [1080, 1128, 1, -24.5], [1160, 1172, 1, -18.5], [1240, 1222, 1, -15.5], [1320, 1282, 1, -16.5],
      [1390, 1345, 1, -15.5], [1450, 1410, 1, -16], [1500, 1480, 1, -3], [1540, 1555, 'd'], [1565, 1630, 'd'],
      [1578, 1710, 'd'], [1578, 1790, 'd'], [1565, 1860, 'd'], [1540, 1925, 'd'], [1500, 1975, 'd'],
      [1450, 2012, 'd'], [1390, 2038, 'd'], [1320, 2052, 'd'], [1250, 2056, 'd'], [1180, 2052, 'd', 6],
      [1100, 2040, 'd'], [1020, 2012, 'd'], [940, 1975, 'd'], [860, 1930, 'd'], [780, 1880, 'd'],
      [700, 1825, 'd'], [620, 1765, 'd'], [540, 1700, 'd'], [460, 1630, 1, 23], [380, 1560, 1, 49.5],
      [310, 1500, 1, 53], [255, 1450, 1, 36.5],
    ],
    riseThr: 40,
    stripRange: 40,
    desat: [{ hue: [300, 45], amount: 0.92, feather: 22 }],
  },
  'grip-printstream': {
    source: 'dbehvdilq9qc73fe8060',
    crop: [160, 720, 1580, 1320],
    stripRows: 3,
    stripRange: 40,
    stripLevels: [0, 150],
    outline: [
      [259, 1600, 1, 15], [269, 1480, 1, 6], [314, 1372, 1, 5], [390, 1265, 1, 11], [475, 1173, 1, 13],
      [578, 1072, 1, 7], [687, 1006, 1, 8], [797, 946, 1, 8], [906, 891, 1, 8], [1016, 851, 1, 18],
      [1132, 820, 1, 34], [1242, 806, 1, 34], [1351, 822, 1, 15], [1447, 866, 1, -3.5], [1536, 940, 1, -11],
      [1602, 1020, 1, -14], [1638, 1114, 1, -10], [1638, 1198, 1, 2], [1604, 1290, 1, 9], [1548, 1343, 1, 5],
      [1498, 1390, 1, -2], [1400, 1454, 1, -1], [1300, 1519, 1, -1], [1200, 1584, 1, -1], [1100, 1652, 1, 0],
      [1000, 1721, 1, 8], [900, 1786, 1, 25], [800, 1848, 1, 36], [700, 1905, 1, 34], [620, 1946, 1, 18],
      [520, 1946, 1, 11], [440, 1910, 1, 31], [370, 1850, 1, 40], [312, 1780, 1, 34], [274, 1690, 1, 25],
    ],
    desat: [{ amount: 1 }],
  },
};
