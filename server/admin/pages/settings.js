// Sozlamalar: havolalar, ijtimoiy tarmoqlar, ko'rinish, matnlar, xavfsizlik, demo ma'lumot.
import { html, raw } from '../../lib/html.js';
import { getSettings, demoCounts } from '../../db/repo.js';
import { ic } from '../icons.js';
import { shell } from '../layout.js';
import { field, textarea, switchRow, segmented } from '../ui.js';

const SECTIONS = [
  ['havolalar', 'Havolalar', 'link'],
  ['ijtimoiy', 'Ijtimoiy tarmoqlar', 'chat'],
  ['korinish', 'Ko‘rinish', 'palette'],
  ['matnlar', 'Matnlar', 'text'],
  ['xavfsizlik', 'Xavfsizlik', 'lock'],
  ['demo', 'Demo ma’lumot', 'bolt'],
];

export function settingsPage(c) {
  const s = getSettings();
  const demo = demoCounts();
  const demoTotal = demo.products + demo.categories + demo.slides;

  const body = html`
<div class="settings">
  <nav class="settings__nav" aria-label="Sozlamalar bo‘limlari">
    ${SECTIONS.map(([id, label, icon]) => html`<a href="#${id}">${ic(icon)}<span>${label}</span></a>`)}
  </nav>

  <form class="settings__form" data-settings-form novalidate autocomplete="off">
    <section class="card" id="havolalar">
      <header class="card__head">
        <div><h2 class="card__title">Havolalar</h2><p class="card__sub">Tovar tugmalari, tepa panel va footer shu havolalardan foydalanadi.</p></div>
      </header>
      <div class="stack">
        ${segmented({
          name: 'default_dest',
          value: s.default_dest,
          label: 'Standart yo‘nalish',
          className: 'seg--wrap',
          hint: 'Tovarda «Standart» tanlangan bo‘lsa, tugma shu yerga olib boradi. Har bir tovarda buni alohida o‘zgartirish mumkin.',
          options: [
            { value: 'uzum', label: 'Uzum', icon: 'bag' },
            { value: 'channel', label: 'Telegram kanal', icon: 'telegram' },
            { value: 'dm', label: 'Telegram lichka', icon: 'chat' },
          ],
        })}
        <div class="grid-2">
          ${field({ name: 'uzum_shop_lootbox', label: 'Uzum do‘kon havolasi: LOOTBOX', value: s.uzum_shop_lootbox, type: 'url', mono: true, placeholder: 'https://uzum.uz/uz/shop/lootbox', hint: 'O‘z havolasi yo‘q LOOTBOX tovarlari shu do‘konga olib boradi.' })}
          ${field({ name: 'uzum_shop_fit', label: 'Uzum do‘kon havolasi: LOOTBOX FIT', value: s.uzum_shop_fit, type: 'url', mono: true, placeholder: 'https://uzum.uz/uz/shop/lootboxfit', hint: 'O‘z havolasi yo‘q FIT tovarlari shu do‘konga olib boradi.' })}
        </div>
        <div class="grid-2">
          ${field({ name: 'tg_channel', label: 'Telegram kanal', value: s.tg_channel, mono: true, placeholder: '@kanal_nomi yoki https://t.me/kanal_nomi', hint: 'Yopiq kanal uchun taklif havolasini (https://t.me/+...) yozing.' })}
          ${field({ name: 'tg_dm', label: 'Lichka uchun username', value: s.tg_dm, mono: true, placeholder: '@username', hint: '«Telegramda yozish» tugmasi shu odamga xabar ochadi.' })}
        </div>
        ${textarea({ name: 'dm_template', label: 'Lichkaga tayyor xabar', value: s.dm_template, rows: 2, maxlength: 300, counter: true, hint: 'Xaridor tugmani bosganda shu matn Telegramda tayyor turadi. {nom} o‘rniga tovar nomi qo‘yiladi.' })}
      </div>
    </section>

    <section class="card" id="ijtimoiy">
      <header class="card__head"><div><h2 class="card__title">Ijtimoiy tarmoqlar</h2><p class="card__sub">To‘ldirilganlari saytning pastki qismida chiqadi. To‘liq havola yoki @nom yozing.</p></div></header>
      <div class="grid-3">
        ${field({ name: 'instagram', label: 'Instagram', value: s.instagram, mono: true, placeholder: '@lootbox.uz' })}
        ${field({ name: 'tiktok', label: 'TikTok', value: s.tiktok, mono: true, placeholder: '@lootbox.uz' })}
        ${field({ name: 'youtube', label: 'YouTube', value: s.youtube, mono: true, placeholder: '@lootbox' })}
      </div>
    </section>

    <section class="card" id="korinish">
      <header class="card__head"><div><h2 class="card__title">Ko‘rinish</h2></div></header>
      <div class="stack">
        ${segmented({
          name: 'card_click',
          value: s.card_click,
          label: 'Tovar kartochkasi bosilganda',
          className: 'seg--wrap',
          hint: '«Tovar sahifasi»: avval rasm va tavsif ochiladi, tugma o‘sha yerda. «To‘g‘ridan-to‘g‘ri havola»: kartochka bosilishi bilan Uzum yoki Telegram ochiladi.',
          options: [
            { value: 'page', label: 'Tovar sahifasi ochiladi' },
            { value: 'direct', label: 'To‘g‘ridan-to‘g‘ri havola' },
          ],
        })}
        ${segmented({
          name: 'motion',
          value: s.motion === 'auto' ? 'auto' : 'full',
          label: 'Animatsiyalar',
          className: 'seg--wrap',
          hint: 'Ba’zi kompyuter va telefonlarda animatsiyalar tizim sozlamasida o‘chirilgan bo‘ladi (masalan, Windows’da «Animatsiya effektlari»). «Har doim to‘liq»: sayt animatsiyalari baribir ko‘rsatiladi. «Qurilma sozlamasiga qarab»: bunday qurilmada sayt tinch ko‘rinadi, slaydlar o‘zi almashmaydi.',
          options: [
            { value: 'full', label: 'Har doim to‘liq' },
            { value: 'auto', label: 'Qurilma sozlamasiga qarab' },
          ],
        })}
        <div class="switches">
          ${switchRow({ name: 'show_prices', checked: s.show_prices !== '0', label: 'Narxlarni ko‘rsatish', hint: 'O‘chirilsa, saytda hech bir tovarning narxi chiqmaydi.' })}
          ${switchRow({ name: 'show_other_links', checked: s.show_other_links !== '0', label: 'Qo‘shimcha tugmalar', hint: 'Tovar sahifasida asosiy tugmadan tashqari boshqa mavjud havolalar ham kichik tugma bo‘lib chiqadi.' })}
        </div>
      </div>
    </section>

    <section class="card" id="matnlar">
      <header class="card__head"><div><h2 class="card__title">Matnlar</h2><p class="card__sub">Yuguruvchi lenta, brend haqida va qidiruv tizimlari uchun matnlar.</p></div></header>
      <div class="grid-2 grid-2--top">
        <div class="stack">
          <h3 class="subhead"><span class="chip chip--lootbox">LOOTBOX</span></h3>
          ${textarea({ name: 'ticker_lootbox', label: 'Yuguruvchi lenta', value: s.ticker_lootbox, rows: 4, hint: 'Har qatorga bitta ibora. Bo‘sh bo‘lsa, lenta ko‘rinmaydi.' })}
          ${textarea({ name: 'about_lootbox', label: 'Brend haqida', value: s.about_lootbox, rows: 4, maxlength: 600, counter: true, hint: 'Bosh sahifadagi katta matn va footer.' })}
          ${field({ name: 'seo_title_lootbox', label: 'Sahifa sarlavhasi (SEO)', value: s.seo_title_lootbox, maxlength: 120, hint: 'Brauzer oynasi va qidiruv natijasida chiqadi. 60 belgigacha yaxshi.' })}
          ${textarea({ name: 'seo_desc_lootbox', label: 'Sahifa tavsifi (SEO)', value: s.seo_desc_lootbox, rows: 3, maxlength: 300, counter: true, hint: 'Qidiruv natijasi va Telegramdagi havola ostida chiqadi.' })}
        </div>
        <div class="stack">
          <h3 class="subhead"><span class="chip chip--fit">LOOTBOX FIT</span></h3>
          ${textarea({ name: 'ticker_fit', label: 'Yuguruvchi lenta', value: s.ticker_fit, rows: 4, hint: 'Har qatorga bitta ibora. Bo‘sh bo‘lsa, lenta ko‘rinmaydi.' })}
          ${textarea({ name: 'about_fit', label: 'Brend haqida', value: s.about_fit, rows: 4, maxlength: 600, counter: true, hint: 'Bosh sahifadagi katta matn va footer.' })}
          ${field({ name: 'seo_title_fit', label: 'Sahifa sarlavhasi (SEO)', value: s.seo_title_fit, maxlength: 120, hint: 'Brauzer oynasi va qidiruv natijasida chiqadi. 60 belgigacha yaxshi.' })}
          ${textarea({ name: 'seo_desc_fit', label: 'Sahifa tavsifi (SEO)', value: s.seo_desc_fit, rows: 3, maxlength: 300, counter: true, hint: 'Qidiruv natijasi va Telegramdagi havola ostida chiqadi.' })}
        </div>
      </div>
    </section>

    <div class="savebar" data-savebar>
      <p class="savebar__status" data-save-status>Barcha o‘zgarishlar saqlangan</p>
      <div class="savebar__actions">
        <button class="btn btn--primary" type="submit" data-save>${ic('check')}<span>Saqlash</span></button>
      </div>
    </div>
  </form>

  <div class="settings__extra">
    <section class="card" id="xavfsizlik">
      <header class="card__head"><div><h2 class="card__title">Xavfsizlik</h2></div></header>
      <div class="stack">
        <p class="note">${ic('lock')}<span>Admin paroli loyiha papkasidagi <code>.env</code> faylida turadi: <code>ADMIN_PASSWORD</code> qatori. O‘zgartirish uchun faylni tahrirlab, serverni qayta ishga tushiring. Parol kamida 8 belgidan iborat bo‘lsin.</span></p>
        <div class="row-action">
          <div><b>Barcha qurilmalardan chiqish</b><p>Hamma ochiq sessiyalar yopiladi, shu qurilmada ham qayta kirish kerak bo‘ladi.</p></div>
          <button class="btn btn--ghost" type="button" data-end-sessions>${ic('logout')}<span>Hammasidan chiqish</span></button>
        </div>
      </div>
    </section>

    <section class="card" id="demo">
      <header class="card__head"><div><h2 class="card__title">Demo ma’lumot</h2></div></header>
      ${demoTotal
        ? html`<div class="row-action">
            <div><b>Namuna tovarlar, kategoriyalar va slaydlar</b><p>Hozir ${demo.products} ta tovar, ${demo.categories} ta kategoriya va ${demo.slides} ta slayd demo sifatida belgilangan. O‘chirilganda o‘zingiz qo‘shgan tovarlarga tegilmaydi. Ichida o‘z tovaringiz bor demo kategoriya saqlanib qoladi.</p></div>
            <button class="btn btn--danger-ghost" type="button" data-clear-demo>${ic('trash')}<span>Demoni o‘chirish</span></button>
          </div>`
        : html`<p class="note">${ic('check')}<span>Demo ma’lumot yo‘q. Saytda faqat o‘zingiz qo‘shgan narsalar turibdi.</span></p>`}
    </section>
  </div>
</div>`;

  return shell(c, {
    title: 'Sozlamalar',
    active: 'settings',
    scripts: ['settings'],
    wide: true,
    body: raw(String(body)),
  });
}
