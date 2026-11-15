// Hero slayder: o'zi almashadi (ustiga kelsangiz to'xtaydi), surish, klaviatura,
// sichqonchaga ergashadigan chizma.
export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('[data-hero-slide]')];
  const dots = [...hero.querySelectorAll('[data-hero-go]')];
  // "Tinch" rejim (boot.js qo'yadi): o'zi almashmaydi, sichqonchaga ergashmaydi
  const reduced = document.documentElement.classList.contains('calm');
  let current = 0;
  let leaveTimer = 0;

  const setTone = (index) => {
    const tone = slides[index]?.dataset.tone;
    if (tone) hero.style.setProperty('--hero-tone', tone);
  };

  const restartBar = (dot) => {
    const bar = dot.querySelector('.hero__bar i');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth; // animatsiyani boshidan boshlash uchun
    bar.style.animation = '';
  };

  function go(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current || slides.length < 2) return;
    const from = slides[current];
    const to = slides[next];

    // Fokus ketayotgan slayd ichida bo'lsa, u yo'qolib qolmasligi uchun yangi slaydga ko'chiriladi
    const hadFocus = from.contains(document.activeElement);

    clearTimeout(leaveTimer);
    for (const slide of slides) slide.classList.remove('is-leaving');
    from.classList.add('is-leaving');
    from.classList.remove('is-active');
    leaveTimer = setTimeout(() => from.classList.remove('is-leaving'), 900);

    to.classList.add('is-active');
    to.inert = false;
    if (hadFocus) (to.querySelector('.hero__actions a') || dots[next])?.focus({ preventScroll: true });
    from.inert = true;

    dots.forEach((dot, i) => {
      const active = i === next;
      dot.classList.toggle('is-active', active);
      if (active) {
        dot.setAttribute('aria-current', 'true');
        restartBar(dot);
      } else {
        dot.removeAttribute('aria-current');
      }
    });

    current = next;
    setTone(next);
  }

  setTone(0);
  // Birinchi slayd sahifa ochilganda animatsiya bilan kirib keladi
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  if (slides.length < 2) return;
  if (reduced) hero.classList.add('is-static');

  // Avtomatik almashish: faol chiziqcha to'lganda keyingi slayd
  hero.addEventListener('animationend', (event) => {
    if (event.animationName === 'hero-bar') go(current + 1);
  });

  for (const dot of dots) dot.addEventListener('click', () => go(Number(dot.dataset.heroGo)));
  hero.querySelector('[data-hero-prev]')?.addEventListener('click', () => go(current - 1));
  hero.querySelector('[data-hero-next]')?.addEventListener('click', () => go(current + 1));

  // To'xtatish: ustida turganda, fokusda, ko'rinmayotganda
  const pauses = new Set();
  const setPause = (reason, on) => {
    if (on) pauses.add(reason);
    else pauses.delete(reason);
    hero.classList.toggle('is-paused', pauses.size > 0);
  };
  const content = hero.querySelector('.hero__slides');
  // Sichqoncha faqat tugmalar ustida turganda to'xtaydi (butun hero ustida emas — aks holda
  // kompyuterda slayder deyarli hech qachon o'zi almashmaydi)
  content.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'mouse') setPause('hover', Boolean(event.target.closest('.hero__actions')));
  });
  content.addEventListener('pointerleave', () => setPause('hover', false));
  hero.addEventListener('focusin', () => setPause('focus', true));
  hero.addEventListener('focusout', () => setPause('focus', false));
  document.addEventListener('visibilitychange', () => setPause('hidden', document.hidden));
  new IntersectionObserver(([entry]) => setPause('offscreen', !entry.isIntersecting), { threshold: 0.3 }).observe(hero);

  hero.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') go(current + 1);
    if (event.key === 'ArrowLeft') go(current - 1);
  });

  // Surish (telefon va sichqoncha)
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let swiped = false;
  content.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    tracking = true;
    swiped = false;
    startX = event.clientX;
    startY = event.clientY;
  });
  const finish = (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiped = true;
      go(current + (dx < 0 ? 1 : -1));
    }
  };
  content.addEventListener('pointerup', finish);
  content.addEventListener('pointercancel', () => { tracking = false; });
  // Surgandan keyin tasodifan tugma bosilib ketmasin
  content.addEventListener('click', (event) => {
    if (swiped) {
      event.preventDefault();
      event.stopPropagation();
      swiped = false;
    }
  }, true);
  content.addEventListener('dragstart', (event) => event.preventDefault());

  // Chizma sichqonchaga ergashadi
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0;
    hero.addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = hero.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const my = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        hero.style.setProperty('--mx', mx.toFixed(3));
        hero.style.setProperty('--my', my.toFixed(3));
      });
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--mx', '0');
      hero.style.setProperty('--my', '0');
    });
  }
}
