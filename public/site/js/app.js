// Saytning barcha interaktiv qismlari shu yerdan ishga tushadi.
import { initHeader } from './header.js';
import { initHero } from './hero.js';
import { initCarousels } from './carousel.js';
import { initReveal } from './reveal.js';
import { initCursor } from './cursor.js';
import { initTracking } from './track.js';
import { initProduct } from './product.js';
import { initTilt } from './tilt.js';

// boot.js shu belgiga qarab biladi: asosiy skript yuklandi va ishlayapti
document.documentElement.setAttribute('data-app', '1');
document.documentElement.classList.add('js');

const steps = [initHeader, initHero, initCarousels, initReveal, initCursor, initTracking, initProduct, initTilt];

for (const step of steps) {
  try {
    step();
  } catch (err) {
    // Bitta qism buzilsa, qolganlari ishlayversin
    console.error(err);
  }
}

// Kartochkadan tovar sahifasiga o'tganda rasm "uchib o'tadi" (brauzer qo'llasa)
document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-card-link]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const media = link.matches('[data-vt-media]') ? link : link.querySelector('[data-vt-media]');
  if (!media) return;
  // Bir sahifada bir xil nom ikki marta bo'lmasligi kerak (tovar sahifasidagi katta rasm ham shu nomda)
  const stage = document.querySelector('[data-stage]');
  if (stage) stage.style.viewTransitionName = 'none';
  media.style.viewTransitionName = 'product-media';
});

// Katalogdagi saralash: tanlanganda sahifa o'zi yangilanadi
document.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-autosubmit]');
  if (!select || !select.form) return;
  const url = new URL(select.form.action, location.href);
  if (select.value && select.value !== 'sort') url.searchParams.set('sort', select.value);
  location.assign(url);
});

// Orqaga qaytilganda: saralash ro'yxati manzildagi qiymatni ko'rsatsin (brauzer eskisini eslab qoladi),
// kartochkalardagi vaqtinchalik belgilar tozalansin.
window.addEventListener('pageshow', (event) => {
  const current = new URLSearchParams(location.search).get('sort') || 'sort';
  for (const select of document.querySelectorAll('select[data-autosubmit]')) {
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }
  if (!event.persisted) return;
  for (const el of document.querySelectorAll('[data-vt-media]')) el.style.viewTransitionName = '';
});
