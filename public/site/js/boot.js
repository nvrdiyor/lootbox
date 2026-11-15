// Sahifa chizilishidan OLDIN ishlaydi (kichik va bloklovchi):
//  - "js" sinfini qo'yadi — paydo bo'lish animatsiyalari faqat JS bor bo'lsa yashiradi;
//  - "tinch" rejimni aniqlaydi (sozlamada ruxsat berilgan va qurilmada animatsiyalar o'chirilgan);
//  - LOOTBOX ↔ FIT o'tishini aniqlab, "parda" animatsiyasini yoqadi.
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Standart: sayt har doim to'liq animatsiya bilan ishlaydi (data-motion="full").
  // Admin «Qurilma sozlamasiga qarab» ni tanlasa (data-motion="auto"), animatsiyalari
  // o'chirilgan qurilmada sayt tinch ko'rinadi.
  var calm =
    root.getAttribute('data-motion') === 'auto' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) root.classList.add('calm');

  var brand = root.getAttribute('data-brand');
  var previous = null;
  try {
    previous = sessionStorage.getItem('lb-brand');
    sessionStorage.setItem('lb-brand', brand);
  } catch (err) {
    // sessionStorage yopiq bo'lishi mumkin
  }

  // Ehtiyot chorasi: asosiy skript (app.js) yuklanmay qolsa ham sahifa o'qiladigan bo'lib qoladi —
  // hero matni ko'rinadi, yashirib qo'yilgan bo'limlar ochiladi.
  setTimeout(function () {
    var hero = document.querySelector('[data-hero]');
    if (hero) hero.classList.add('is-ready');
    if (!root.hasAttribute('data-app')) root.classList.remove('js');
  }, 3000);

  window.addEventListener('pagereveal', function (event) {
    if (!event.viewTransition) return;
    if (calm) {
      event.viewTransition.skipTransition();
      return;
    }
    if (previous && previous !== brand) {
      root.setAttribute('data-vt', 'brand');
      event.viewTransition.finished.finally(function () {
        root.removeAttribute('data-vt');
      });
    }
  });
})();
