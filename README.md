# LOOTBOX — brend vitrinasi

LOOTBOX (texnika va gaming aksessuarlari) va LOOTBOX FIT (kiyimlar) uchun sayt.
Tashrif buyuruvchi tovarni ko‘radi, tugmani bosadi va siz tanlagan joyga o‘tadi:
Uzum’dagi tovar sahifasi, Telegram kanal yoki lichka. Hammasi admin paneldan boshqariladi.

## Ishga tushirish

Kerak: Node.js 22.13 yoki yangirog‘i (24 tavsiya etiladi). Boshqa hech narsa o‘rnatish shart emas.

```bash
npm install
```

```bash
npm run dev
```

| Manzil | Nima |
| --- | --- |
| http://localhost:3210 | LOOTBOX |
| http://localhost:3210/fit | LOOTBOX FIT |
| http://localhost:3210/admin | Admin panel |

Birinchi ishga tushirishda baza yaratiladi: LOOTBOX bo‘limiga Uzum’dagi do‘koningiz tovarlari (rasmlari bilan),
FIT bo‘limiga namuna kiyimlar yoziladi.

`npm run dev` rejimida fayl o‘zgarsa, sahifa o‘zi yangilanadi.

## Admin paroli qayerda

Parol loyiha papkasidagi **`.env`** faylida, `ADMIN_PASSWORD=` qatorida.
Birinchi ishga tushirishda `.env` o‘zi yaratiladi va parol tasodifiy qilib qo‘yiladi: faylni oching va ko‘ring.

Parolni almashtirish: `.env` da `ADMIN_PASSWORD` qiymatini o‘zgartiring (kamida 8 belgi) va serverni qayta ishga tushiring.
`.env` fayli git’ga tushmaydi (`.gitignore` da turadi). Namuna: `.env.example`.

## Havolalarni o‘zgartirish

**Butun sayt uchun** — Admin → **Sozlamalar** → Havolalar:

- standart yo‘nalish (tovar tugmasi qayerga olib boradi): Uzum, Telegram kanal yoki lichka;
- Uzum’dagi do‘kon havolalari (LOOTBOX va FIT alohida);
- Telegram kanal va lichka uchun username;
- lichkaga yoziladigan tayyor matn (`{nom}` o‘rniga tovar nomi qo‘yiladi).

**Bitta tovar uchun** — Admin → **Tovarlar** → tovar → «Tugma havolasi» bo‘limi:
«Standart» (sozlamadagi), Uzum (shu tovarning havolasi), Telegram kanal (post havolasi) yoki lichka.
Tanlaganingiz zahoti ostida tugma aynan qaysi manzilga olib borishi ko‘rsatiladi.

Tanlangan yo‘nalishning havolasi bo‘sh bo‘lsa, sayt o‘zi mavjud bo‘lgan boshqasini qo‘yadi
(avval Uzum, keyin kanal, keyin lichka). Hech biri bo‘lmasa, tugma o‘rnida «Tez orada sotuvda» chiqadi.

## Tovar qo‘shish

Admin → Tovarlar → «Tovar qo‘shish». Rasmlarni oynaga sudrab tashlang (bir nechtasini birdan mumkin):
ular brauzerning o‘zida kichraytiriladi, keyin yuklanadi. Birinchi rasm — muqova; tartibni sudrab o‘zgartirasiz.
Rasm yuklanmagan tovarda kategoriyaga mos chizma ko‘rinadi.

Ruxsat etilgan rasmlar: JPG, PNG, WebP. Tavsiya: 3:4 nisbat (masalan 1080×1440, Uzum’dagi kabi).

## Tovarlar va rasmlar

LOOTBOX bo‘limidagi tovarlar Uzum’dagi do‘koningizdan olingan: to‘rtta e’lonning har bir varianti (rang yoki model)
saytda alohida tovar — jami 17 ta. Nomi, narxi va tavsifi o‘sha yerdagidek, tugma esa Uzum’da aynan shu variantni
ochadi. Ro‘yxat `server/db/catalog-data.js` faylida turadi.

**Rasmlar — faqat tovarning o‘zi, orqa fonsiz.** Uzum’dagi dizaynli kartochka-rasmlar saytga qo‘yilmaydi.
Rasmlar uch xil yo‘l bilan tayyorlangan:

- **Internetdan topilgan toza suratlar** (oq fonli, yirik) — 10 ta tovar: switchlar, universal va model-glaydlar.
  Ularning foni olib tashlangan.
- **Uzum’dagi o‘z e’lon rasmlaringizdan kesilgan** — 5 ta tovar: hamma grip stikerlar (oq, qora, KDA oq va qora,
  Printstream), sichqonchasi bilan. Internetdagi suratlarda bu stikerlar sichqonchaga to‘liq yopishtirilmagan
  (o‘rtasi ochiq) yoki umuman yo‘q, sizning rasmlaringizda esa sichqoncha to‘liq o‘ralgan.
- **Qayta chizilgan** — 2 ta tovar: ARCANE gilamchalar. Internetda faqat boshqa brend logotipi tushgan asl
  gilamchaning rasmlari bor, plakatdan kesilgan bo‘lak esa xira chiqadi. Shuning uchun gilamcha o‘z o‘lchami
  (450×400×6 mm) va plakatingizdagi ko‘rinish burchagida toza chizilgan, logotipi esa e’loningizdagi haqiqiy
  suratdan («REAL FOTO») ko‘chirilgan.

Har bir rasm qaysi sahifadan olingani va qanday tayyorlangani `scripts/cutouts/specs.js` da yozilgan. Tayyor fayllar
`server/db/catalog-media/` papkasida. Sayt fonsiz rasmni o‘zi taniydi va uni kartochka foni ustida, soya va
yorug‘lik bilan, 3D sahnada ko‘rsatadi.

> **Rasm huquqi.** Internetdan olingan suratlar begona sotuvchi yoki ishlab chiqaruvchiniki: ulardan foydalanish
> huquqi sizning zimmangizda. Eng ishonchlisi — ta’minotchingiz bergan rasmlar yoki o‘zingiz olgan suratlar.
> Loyiha ochiq GitHub repoda bo‘lsa, `server/db/catalog-media/` dagi rasmlar ham hamma uchun ochiq bo‘ladi.

O‘z rasmingizni qo‘ymoqchi bo‘lsangiz: Admin → Tovarlar → tovar → rasmni yuklang. **Fonsiz PNG yoki WebP** yuklasangiz
(shaffof fonli), u ham xuddi shunday «havoda turadigan» bo‘lib chiqadi. Foni bor oddiy surat ramkada ko‘rsatiladi.

```bash
npm run catalog
```

Yo‘q tovarlarni bazaga qo‘shadi va rasmi yo‘q tovarlarga tayyor rasmlarni biriktiradi. Internet kerak emas;
qayta-qayta ishga tushirsa bo‘ladi: bor tovarga, admin panelda o‘zgartirgan nom va narxlaringizga hamda rasmi bor
tovarga tegilmaydi.

```bash
npm run cutouts
```

Rasmlarni manbalaridan qaytadan yasaydi: manba suratni yuklab oladi va fonidan ajratadi, gilamchani esa qaytadan
chizadi (internet va kompyuterda Chrome kerak). Qaysi rasmdan va qanday kesilishi `scripts/cutouts/specs.js` da
yozilgan — gilamcha rangi ham o‘sha yerda (`color`). Yangi tovar qo‘shilganda,
manba almashtirilganda yoki kesim yoqmaganda kerak bo‘ladi. Bitta rasmni yozmasdan tekshirib ko‘rish:
`npm run cutouts -- --check grip-oq` (natija `data/shots/` papkasida).

```bash
npm run catalog -- --replace-images
```

Yangilangan rasmlarni bazadagi tovarlarga yozadi: katalog qo‘ygan eski rasmlar yangisiga almashtiriladi, admin
paneldan o‘zingiz yuklagan rasmlarga tegilmaydi.

Uzum’da narx o‘zgarsa, saytda o‘zi o‘zgarmaydi: admin panelda tahrirlaysiz.

**Bosh sahifadagi katta blok (hero).** Har bir slayd uch xil ko‘rinishi mumkin:

- slaydga rasm yuklangan — rasm butun ekranni egallaydi;
- rasm yuklanmagan — slayd bog‘langan tovar (yoki kategoriyadagi tovarlar) 3D sahnada turadi: oldinda bittasi katta,
  ortida yana ikkitasi; ular navbat bilan oldinga chiqadi va sichqonchaga qarab buriladi;
- ularda ham rasm yo‘q — tanlangan chizma ko‘rsatiladi.

Qaysi tovarlar chiqishini Admin → **Hero slaydlar** → slayd → «Tugma qayerga olib boradi» orqali tanlaysiz
(Kategoriya yoki Tovar). Kategoriya tanlansa, undagi birinchi uchta tovar olinadi (tartibni Tovarlar sahifasida
sudrab o‘zgartirasiz).

## Logotipni almashtirish

Hozir logotip — chizilgan «LOOTBOX» so‘zi. O‘z logotipingizni qo‘yish uchun faylni shu nom bilan tashlang:

```
public/brand/logo-lootbox.svg     (yoki .png / .webp)
public/brand/logo-fit.svg
```

Sayt o‘zi shu fayllarni ishlatadi. Fayl bo‘lmasa, chizilgan so‘z-logotip qoladi.

## Namuna (demo) tovarlar

LOOTBOX FIT do‘konida hozircha tovar yo‘q, shuning uchun FIT bo‘limida o‘ylab topilgan namuna kiyimlar turibdi
(rasm o‘rnida chizma). Ular «Demo» deb belgilangan. O‘chirish: Admin → Sozlamalar → Demo ma’lumot, yoki buyruq bilan:

```bash
npm run seed -- --clear
```

LOOTBOX tovarlariga va o‘zingiz qo‘shgan tovarlarga tegilmaydi. Namunani qaytadan yozish: `npm run seed -- --reset`.

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Ishlab chiqish rejimi: fayl o‘zgarsa o‘zi yangilanadi |
| `npm start` | Oddiy (production) rejim |
| `npm run check` | Avtomatik tekshiruv: sahifalar, havolalar, rasm va admin himoyasi, serverga qo‘yilgandagi rejim. Vaqtinchalik bazada ishlaydi, ma’lumotingizga tegmaydi |
| `npm run shots` | Saytni ko‘rinmas Chrome’da ochib, animatsiyali holatini suratga oladi: `data/shots/` (server ishlab turganda) |
| `npm run catalog` | Uzum’dagi tovarlar: yo‘g‘ini bazaga qo‘shadi, rasmsiziga tayyor (fonsiz) rasmini biriktiradi. `-- --replace-images` bilan: yangilangan rasmlarni eskilari o‘rniga yozadi |
| `npm run cutouts` | Tovar rasmlarini manba suratlardan qaytadan yasaydi (fonini olib tashlaydi): `server/db/catalog-media/` (internet va Chrome kerak) |
| `npm run seed` | FIT bo‘limidagi namuna (demo) ma’lumot (`-- --reset`, `-- --clear`) |
| `npm run og` | Telegram va ijtimoiy tarmoqlar uchun muqova rasmlarini qayta yaratadi (server ishlab turganda) |

## Animatsiyalar

Sayt standart holatda animatsiyalarni **har doim** ko‘rsatadi: slaydlar o‘zi almashadi, sarlavhalar so‘zma-so‘z ochiladi,
bo‘limlar scroll bilan paydo bo‘ladi.

Ba’zi kompyuter va telefonlarda animatsiyalar tizim sozlamasida o‘chirilgan bo‘ladi (Windows’da
Sozlamalar → Maxsus imkoniyatlar → Vizual effektlar → «Animatsiya effektlari»). Shunday qurilmalarda sayt
tinch ko‘rinishini xohlasangiz: Admin → Sozlamalar → Ko‘rinish → Animatsiyalar → «Qurilma sozlamasiga qarab».
Bu harakatdan boshi aylanadigan odamlar uchun qulayroq, lekin shu kompyuterda (animatsiyalari o‘chirilgan) sayt ham harakatsiz ko‘rinadi.

## Telefonda ko‘rish

`.env` da `HOST=0.0.0.0` qiling, serverni qayta ishga tushiring va telefonda (bir xil Wi-Fi)
`http://<kompyuter-IP-manzili>:3210` ni oching (kompyuter nomi bilan emas, aynan IP manzil bilan).

## Papkalar

```
server/
  index.js, app.js, config.js   ishga tushirish, yo‘llar, sozlamalar (.env)
  db/        baza sxemasi, so‘rovlar (repo.js), Uzum’dagi tovarlar (catalog-data.js) va ularning fonsiz
             rasmlari (catalog-media/), namuna (seed.js)
  lib/       havolalar, rasm tekshiruvi, admin himoyasi, HTML shablon yordamchisi
  site/      sayt sahifalari: bosh sahifa, katalog, tovar; chizmalar (art.js), logotip (brand.js)
  admin/     admin panel sahifalari va API
  i18n/      sayt matnlari (uz.js)
  dev/       faqat dev rejimida: avto-yangilanish, chizmalar va muqova ko‘rinishi
public/
  site/      sayt uslublari va skriptlari
  admin/     admin uslublari va skriptlari
  shared/    shriftlar va chizma uslublari
  vendor/    shrift fayllari, SortableJS
  brand/     muqova rasmlari; o‘z logotipingiz shu yerga
data/        baza (lootbox.db) va yuklangan rasmlar (uploads/) — git’ga tushmaydi
scripts/     tekshiruv, katalog, rasmni fonsiz qilish (cutouts), surat va muqova skriptlari
```

**Zaxira nusxa:** `data/` papkasini nusxalab qo‘ysangiz kifoya — baza ham, rasmlar ham shu yerda.

## Texnik tomoni

- Node.js + [Hono](https://hono.dev), baza — Node’ning o‘zidagi SQLite (`node:sqlite`). Qo‘shimcha dastur yoki kompilyator kerak emas.
- Sahifalar serverda tayyorlanadi, shuning uchun tez ochiladi va Telegram’da havola rasm bilan chiqadi.
- Ko‘rishlar va tugma bosishlar sanaladi (admin bosh sahifasida). Shaxsiy ma’lumot yig‘ilmaydi.
- Himoya: admin sessiyasi (cookie), har bir o‘zgartirishda CSRF tekshiruvi, parolni taxmin qilishga cheklov,
  rasm turi fayl ichidan tekshiriladi, sayt boshqa sahifa ichiga joylanmaydi (CSP).

## Rus tilini qo‘shish (keyin)

Tayyor joylar: `server/i18n/` (matnlar), bazadagi `*_ru` ustunlari (nom, tavsif, slaydlar).
Qadamlar `server/i18n/index.js` boshida yozilgan.

## Serverga qo‘yish (keyin)

Hozir sayt faqat shu kompyuterda ishlaydi. VPS’ga qo‘yilganda:

1. loyihani ko‘chirish, `npm ci --omit=dev`, `npm start` (systemd yoki pm2 orqali). Admin panelda qilgan
   o‘zgarishlaringiz (narx, matn, o‘zingiz yuklagan rasmlar) git’da emas, `data/` papkasida: uni ham serverga
   ko‘chiring. Ko‘chirmasangiz, server boshlang‘ich katalog bilan (17 tovar, rasmlari bilan) boshlaydi;
2. `.env` da: kuchli `ADMIN_PASSWORD`, `SITE_URL=https://domeningiz`, nginx ortida `TRUST_PROXY=true`;
3. nginx: domen → `http://127.0.0.1:3210`, HTTPS, gzip va shu uch qator (ularsiz parol urinishlari cheklovi
   va «faqat o‘z saytimizdan» tekshiruvi to‘g‘ri ishlamaydi):

   ```
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

4. `data/` papkasini muntazam zaxiralash.

`SITE_URL` yozilgach sayt faqat shu domen nomi bilan ochiladi (begona nom bilan kelgan so‘rov rad etiladi).
`.env` dagi parol almashtirilsa, server qayta ishga tushganda barcha ochiq sessiyalar yopiladi.
