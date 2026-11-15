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
// USUL: `outline` berilmasa — oq fon usuli (CUT.white), berilsa — kontur usuli (CUT.outline). Koordinatalar har doim
// asl rasm piksellarida.
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
// Tekshiruv tasmasi (--check) kesish chizig'i bo'ylab "yoyilgan" rasm: o'rtadagi chiziq — kesim, tepasi — tashqari,
// pasti — ichkari. Buyum cheti chiziqdan qancha yuqori yoki pastda ko'rinsa, o'sha nuqtaga shuncha siljish beriladi.

const web = (url, page) => ({ url, page });

// Gilamcha konturi: taxminiy kontur chekkaga tortilgach, to‘rt qirrasiga to‘g‘ri chiziq mos keltirilgan va
// burchaklari yumaloqlangan (hamma nuqta aniq).
const PAD_OUTLINE = [
  [172.7, 999.4, 1], [169.9, 990.7, 1], [169.5, 983.2, 1], [171.3, 976.8, 1], [175.3, 971.6, 1],
  [181.6, 967.4, 1], [190.2, 964.4, 1], [248.4, 949.9, 1], [355.1, 923.1, 1], [461.8, 896.4, 1],
  [568.5, 869.6, 1], [675.2, 842.9, 1], [781.9, 816.2, 1], [888.6, 789.4, 1], [934.8, 777.9, 1],
  [944.2, 776.3, 1], [953, 776.5, 1], [961.2, 778.4, 1], [968.7, 782, 1], [975.7, 787.3, 1],
  [982.1, 794.4, 1], [1018.4, 842.2, 1], [1085, 929.7, 1], [1151.7, 1017.2, 1], [1218.3, 1104.8, 1],
  [1284.9, 1192.3, 1], [1316.4, 1233.7, 1], [1321.2, 1241.2, 1], [1323.4, 1247.9, 1], [1322.9, 1253.8, 1],
  [1319.9, 1258.9, 1], [1314.2, 1263.1, 1], [1306, 1266.4, 1], [1248.6, 1284.1, 1], [1143.5, 1316.6, 1],
  [1038.4, 1349, 1], [933.3, 1381.5, 1], [828.2, 1413.9, 1], [723.1, 1446.4, 1], [618, 1478.8, 1],
  [512.9, 1511.3, 1], [430.1, 1536.9, 1], [421, 1538.8, 1], [412.9, 1538.7, 1], [405.7, 1536.6, 1],
  [399.4, 1532.4, 1], [394.2, 1526.2, 1], [389.8, 1518, 1], [366.6, 1462.7, 1], [324.2, 1361.2, 1],
  [281.7, 1259.8, 1], [239.2, 1158.3, 1], [196.7, 1056.8, 1],
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

  // Gilamcha: internetda faqat asl brend (boshqa logotipli) rasmlari bor, shuning uchun Uzum’dagi o‘z rasmimizdan.
  // Qizil va qora plakatda joylashuvi bir xil — kontur bitta (PAD_OUTLINE).
  'arcane-qizil': {
    source: 'dblnigrgc6hc739aur20',
    crop: [90, 690, 1320, 950],
    snap: false,
    inset: 0,
    stripRows: 2,
    stripRange: 24,
    outline: PAD_OUTLINE,
  },
  'arcane-qora': {
    source: 'dblnibjgc6hc739auqv0',
    crop: [90, 690, 1320, 950],
    snap: false,
    inset: 0,
    stripRows: 2,
    stripRange: 24,
    stripLevels: [0, 90],
    outline: PAD_OUTLINE,
  },

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

  // Grip stikerlar sichqonchasi bilan. Qorasida sichqoncha ustiga kattalashtirish belgisi tushgan: belgi kesib
  // tashlanadi (drop), sichqonchaga tushgan qismi esa chet bo‘ylab to‘ldiriladi (patches).
  'grip-qora': {
    source: web(
      'https://m.media-amazon.com/images/I/71qvFHiq0cL._AC_SL1500_.jpg',
      'https://www.amazon.de/JINGDU-kompatibel-Anti-Rutsch-Maus-Aufkleber-Griff-Aufkleber-AC-SchwarzX/dp/B0BYVKDLYC',
    ),
    crop: [230, 440, 1270, 880],
    T: 14,
    keepLargest: 1,
    patches: [{ poly: [[342.5, 1108.5], [475, 1097], [419.5, 1187.5]], dir: [1, 1.017], margin: 3 }],
    drop: [[[340, 1105.5], [342.5, 1108.5], [380.5, 1147.5], [419.5, 1187.5], [422, 1192], [404, 1206], [322, 1122]]],
  },

  // Oq sichqoncha oq fonda, ostida soya bor: avtomatik usul ishlamaydi — kontur qo‘lda, soya tomoni aniq nuqtalar bilan
  'grip-oq': {
    source: web(
      'https://m.media-amazon.com/images/I/71YvHd6sp0L.jpg',
      'https://www.amazon.com/JINGDU-Compatible-Superlight-Sweat-Proof-Protective/dp/B0BYPBSLYV',
    ),
    stripLevels: [170, 255],
    crop: [150, 340, 1450, 1240],
    snapMode: 'grad',
    snapThr: 5,
    snapIn: 44,
    snapOut: 6,
    outline: [
      [277, 950, 'd'], [300, 921, 'd'], [325, 893, 'd'], [350, 866, 'd'], [375, 841, 'd'], [400, 817, 'd'],
      [425, 794, 'd'], [450, 772, 'd'], [475, 753, 'd'], [500, 734, 'd'], [525, 715, 'd'], [550, 697, 'd'],
      [575, 677, 'd'], [600, 657, 'd'], [625, 637, 'd'], [650, 618, 'd'], [665, 606, 'd'], [700, 583, 'd'],
      [750, 548, 'd'], [800, 515, 'd'], [850, 486, 'd'], [900, 463, 'd'], [948, 432], [999, 414], [1050, 402],
      [1100, 394], [1150, 392], [1201, 396], [1252, 404], [1303, 417], [1354, 437], [1405, 468], [1456, 514],
      [1487, 556], [1508, 597], [1520, 649], [1524, 700], [1520, 752], [1508, 803], [1487, 854], [1462, 912],
      [1432, 958], [1404, 978], [1354, 1026], [1304, 1072], [1254, 1114], [1204, 1154], [1154, 1192],
      [1104, 1229], [1054, 1266], [1004, 1304], [954, 1344], [904, 1379], [854, 1412], [804, 1441],
      [740, 1472, 1], [700, 1483, 1], [667, 1489, 1], [633, 1492, 1], [600, 1488, 1], [570, 1482, 1],
      [550, 1472, 1], [525, 1464, 1, -3], [500, 1455, 1, -3], [475, 1443, 1, -3], [450, 1429, 1, -3],
      [424, 1415, 1, -3], [399, 1400, 1, -3], [374, 1382, 1, -3], [350, 1362, 1, -3], [337, 1350, 1, -3],
      [318, 1332, 1, -3], [300, 1312, 1, -3], [290, 1300, 1, -3], [272, 1275, 1, -3], [256, 1250, 1, -3],
      [242, 1226, 1, -3], [232, 1200, 1, -2], [228, 1178, 1, -2], [225, 1150, 1, -2], [225, 1123, 1, -2],
      [226.5, 1100, 1, -2], [231, 1067, 1, -2], [237.5, 1039, 1, -2], [242, 1000, 1], [249, 987, 1],
      [260, 975, 1],
    ],
  },

  // KDA va Printstream: bu dizaynlarning toza fonli rasmi internetda topilmadi — Uzum’dagi o‘z plakatlarimizdan,
  // kontur bo‘yicha. Neon fondan qolgan rangli tus olib tashlanadi (desat).
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
