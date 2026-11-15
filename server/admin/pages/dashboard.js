// Bosh sahifa: sonlar, "sozlash kerak" ro'yxati, 14 kunlik statistika, tez amallar.
import { html, raw } from '../../lib/html.js';
import { formatNumber } from '../../lib/text.js';
import { countProducts, statsSummary, demoCounts, listSlides, listCategories } from '../../db/repo.js';
import { setupFacts } from '../data.js';
import { ic } from '../icons.js';
import { shell } from '../layout.js';
import { BRAND_LABEL, brandChip } from '../ui.js';

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

function chart(stats) {
  const { series } = stats;
  const clicksOf = (item) => item.uzum + item.channel + item.dm;
  const max = Math.max(1, ...series.map((item) => Math.max(item.view, clicksOf(item))));
  const empty = series.every((item) => item.view === 0 && clicksOf(item) === 0);
  const W = 700;
  const H = 210;
  const top = 14;
  const base = 168;
  const step = W / series.length;
  const scale = (value) => (value / max) * (base - top);
  const ticks = [0.5, 1].map((part) => Math.round(max * part)).filter((value, i, list) => value > 0 && list.indexOf(value) === i);

  const bars = series.map((item, i) => {
    const x = i * step + step / 2;
    const clicks = clicksOf(item);
    const [, month, day] = item.day.split('-').map(Number);
    const label = `${day} ${MONTHS[month - 1]}`;
    const viewH = Math.max(item.view ? 3 : 0, scale(item.view));
    const clickH = Math.max(clicks ? 3 : 0, scale(clicks));
    return html`<g class="chart__day">
      <title>${label}: ${item.view} ta ko‘rish, ${clicks} ta bosish</title>
      <rect class="chart__hit" x="${(i * step).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${H}"/>
      <rect class="chart__bar chart__bar--view" x="${(x - 13).toFixed(1)}" y="${(base - viewH).toFixed(1)}" width="12" height="${viewH.toFixed(1)}" rx="3"/>
      <rect class="chart__bar chart__bar--click" x="${(x + 1).toFixed(1)}" y="${(base - clickH).toFixed(1)}" width="12" height="${clickH.toFixed(1)}" rx="3"/>
      <text class="chart__label" x="${x.toFixed(1)}" y="${base + 20}" text-anchor="middle">${day}</text>
      ${day === 1 || i === 0 ? html`<text class="chart__month" x="${x.toFixed(1)}" y="${base + 36}" text-anchor="middle">${MONTHS[month - 1]}</text>` : ''}
    </g>`;
  });

  return html`<div class="chart${empty ? ' is-empty' : ''}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Oxirgi 14 kundagi ko‘rishlar va tugma bosishlar">
      ${ticks.map((value) => {
        const y = (base - scale(value)).toFixed(1);
        return html`<line class="chart__grid" x1="0" x2="${W}" y1="${y}" y2="${y}"/><text class="chart__tick" x="${W}" y="${Number(y) - 5}" text-anchor="end">${value}</text>`;
      })}
      <line class="chart__axis" x1="0" x2="${W}" y1="${base}" y2="${base}"/>
      ${bars}
    </svg>
    ${empty ? html`<p class="chart__empty">Hozircha ma’lumot yo‘q. Saytga tashrif buyurilganda shu yerda ko‘rinadi.</p>` : ''}
  </div>`;
}

function checklist(facts, demo) {
  const { settings } = facts;
  const items = [];
  if (!settings.uzum_shop_lootbox) {
    items.push({ icon: 'bag', title: 'LOOTBOX uchun Uzum do‘kon havolasi kiritilmagan', text: 'Havolasi yo‘q tovarlarning tugmasi shu do‘konga olib boradi.', href: '/admin/settings#havolalar', action: 'Kiritish' });
  }
  if (!settings.uzum_shop_fit) {
    items.push({ icon: 'bag', title: 'LOOTBOX FIT uchun Uzum do‘kon havolasi kiritilmagan', text: 'Havolasi yo‘q tovarlarning tugmasi shu do‘konga olib boradi.', href: '/admin/settings#havolalar', action: 'Kiritish' });
  }
  if (!settings.tg_channel) {
    items.push({ icon: 'telegram', title: 'Telegram kanal kiritilmagan', text: 'Kanal bo‘lmasa, saytdagi «Kanalga o‘tish» bloki va kanal tugmalari ko‘rinmaydi.', href: '/admin/settings#havolalar', action: 'Kiritish' });
  }
  if (!settings.tg_dm) {
    items.push({ icon: 'chat', title: 'Lichka uchun username kiritilmagan', text: 'Username bo‘lmasa, «Telegramda yozish» tugmasi chiqmaydi.', href: '/admin/settings#havolalar', action: 'Kiritish' });
  }
  if (facts.noDest) {
    items.push({ icon: 'link', title: `${facts.noDest} ta tovarning tugmasi hech qayerga olib bormaydi`, text: 'Tovarga havola yozing yoki sozlamalarda umumiy havolani kiriting.', href: '/admin/products?state=nodest', action: 'Ko‘rish' });
  }
  if (facts.noPhoto) {
    items.push({ icon: 'image', title: `${facts.noPhoto} ta tovarda rasm yo‘q`, text: 'Hozir rasm o‘rnida chizma ko‘rsatilmoqda.', href: '/admin/products?state=nophoto', action: 'Ko‘rish' });
  }
  const demoTotal = demo.products + demo.categories + demo.slides;

  if (!items.length && !demoTotal) {
    return html`<div class="done">
      <span class="done__icon">${ic('check')}</span>
      <div><b>Hammasi joyida</b><p>Havolalar kiritilgan, tovarlarda rasm bor.</p></div>
    </div>`;
  }

  return html`<ul class="todo" role="list">
    ${items.map(
      (item) => html`<li class="todo__item">
        <span class="todo__icon">${ic(item.icon)}</span>
        <div class="todo__body"><b>${item.title}</b><p>${item.text}</p></div>
        <a class="btn btn--ghost btn--sm" href="${item.href}">${item.action}${ic('arrow-right')}</a>
      </li>`,
    )}
    ${demoTotal
      ? html`<li class="todo__item todo__item--demo">
          <span class="todo__icon">${ic('bolt')}</span>
          <div class="todo__body">
            <b>Demo ma’lumot turibdi</b>
            <p>Namuna sifatida ${demo.products} ta tovar, ${demo.categories} ta kategoriya va ${demo.slides} ta slayd yozilgan. O‘z tovarlaringizni qo‘shgach, ularni o‘chirib tashlang.</p>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" data-clear-demo>${ic('trash')}Demoni o‘chirish</button>
        </li>`
      : ''}
  </ul>`;
}

export function dashboardPage(c) {
  const counts = new Map(countProducts().map((row) => [row.brand, row]));
  const facts = setupFacts();
  const demo = demoCounts();
  const stats = statsSummary(14);
  const clicks = stats.totals.uzum + stats.totals.channel + stats.totals.dm;
  const rate = stats.totals.view ? Math.round((clicks / stats.totals.view) * 100) : 0;
  const slides = listSlides({}).length;
  const categories = listCategories({}).length;

  const brandTile = (brand) => {
    const row = counts.get(brand) || { total: 0, visible: 0, no_photo: 0 };
    return html`<a class="tile" href="/admin/products?brand=${brand}">
      <span class="tile__label">${BRAND_LABEL[brand]}</span>
      <span class="tile__value">${row.visible}<small> / ${row.total}</small></span>
      <span class="tile__note">tovar saytda ko‘rinadi</span>
      <span class="tile__go">${ic('arrow-right')}</span>
    </a>`;
  };

  const body = html`
    <section class="tiles">
      ${brandTile('lootbox')}
      ${brandTile('fit')}
      <div class="tile">
        <span class="tile__label">Ko‘rishlar · 14 kun</span>
        <span class="tile__value">${formatNumber(stats.totals.view)}</span>
        <span class="tile__note">tovar sahifasi ochilgan</span>
      </div>
      <div class="tile tile--accent">
        <span class="tile__label">Tugma bosishlar · 14 kun</span>
        <span class="tile__value">${formatNumber(clicks)}${stats.totals.view ? html`<small> · ${rate}%</small>` : ''}</span>
        <span class="tile__note">Uzum ${stats.totals.uzum} · Kanal ${stats.totals.channel} · Lichka ${stats.totals.dm}</span>
      </div>
    </section>

    <div class="cols">
      <section class="card">
        <header class="card__head">
          <div><h2 class="card__title">Sozlash kerak</h2><p class="card__sub">Sayt to‘liq ishlashi uchun qolgan ishlar</p></div>
        </header>
        ${checklist(facts, demo)}
      </section>

      <section class="card">
        <header class="card__head"><div><h2 class="card__title">Tez amallar</h2><p class="card__sub">${facts.total} ta tovar · ${categories} ta kategoriya · ${slides} ta slayd</p></div></header>
        <div class="quick">
          <a class="quick__item quick__item--primary" href="/admin/products/new">${ic('plus')}<span>Tovar qo‘shish</span></a>
          <a class="quick__item" href="/admin/categories?new=lootbox">${ic('layers')}<span>Kategoriya qo‘shish</span></a>
          <a class="quick__item" href="/admin/slides?new=lootbox">${ic('image')}<span>Slayd qo‘shish</span></a>
          <a class="quick__item" href="/admin/settings#havolalar">${ic('link')}<span>Havolalarni sozlash</span></a>
          <a class="quick__item" href="/" target="_blank" rel="noopener">${ic('external')}<span>LOOTBOX saytini ochish</span></a>
          <a class="quick__item" href="/fit" target="_blank" rel="noopener">${ic('external')}<span>FIT bo‘limini ochish</span></a>
        </div>
      </section>
    </div>

    <div class="cols cols--wide">
      <section class="card">
        <header class="card__head">
          <div><h2 class="card__title">Oxirgi 14 kun</h2><p class="card__sub">Tovar sahifalari va tugmalar</p></div>
          <div class="legend"><span class="legend__item legend__item--view">Ko‘rishlar</span><span class="legend__item legend__item--click">Bosishlar</span></div>
        </header>
        ${chart(stats)}
      </section>

      <section class="card">
        <header class="card__head"><div><h2 class="card__title">Eng ko‘p bosilgan tovarlar</h2><p class="card__sub">Oxirgi 14 kun</p></div></header>
        ${stats.top.length
          ? html`<ol class="top-list" role="list">
              ${stats.top.map(
                (item, i) => html`<li class="top-list__item">
                  <span class="top-list__n">${String(i + 1).padStart(2, '0')}</span>
                  <a class="top-list__name" href="/admin/products/${item.id}">${item.name}</a>
                  ${brandChip(item.brand)}
                  <span class="top-list__nums"><b>${item.clicks}</b> bosish<i>${item.views} ko‘rish</i></span>
                </li>`,
              )}
            </ol>`
          : html`<p class="card__empty">Hali hech kim tugma bosmagan. Statistika sayt ishlay boshlagach to‘planadi.</p>`}
      </section>
    </div>`;

  return shell(c, {
    title: 'Bosh sahifa',
    active: 'home',
    scripts: ['dashboard'],
    actions: html`<a class="btn btn--primary" href="/admin/products/new">${ic('plus')}<span>Tovar qo‘shish</span></a>`,
    body: raw(String(body)),
  });
}
