// Scroll effektlari: elementlar ekranga kirganda paydo bo'ladi, "brend haqida" matni
// scroll bilan so'zma-so'z yonadi, kategoriya qatorida rasm sichqonchaga ergashadi.
export function initReveal() {
  // "Tinch" rejim (boot.js qo'yadi): hammasi darhol ko'rinadi
  const reduced = document.documentElement.classList.contains('calm');

  // --- Paydo bo'lish
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced) {
    for (const el of items) el.classList.add('is-in');
  } else {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    for (const el of items) observer.observe(el);
  }

  // --- Yuguruvchi lenta tezligi kengligiga mos bo'lsin
  for (const marquee of document.querySelectorAll('[data-marquee]')) {
    const group = marquee.querySelector('.marquee__group');
    if (group) marquee.style.setProperty('--marquee-s', `${Math.max(18, Math.round(group.scrollWidth / 70))}s`);
  }

  // --- So'zma-so'z yonadigan matn
  const blocks = [...document.querySelectorAll('[data-words]')].map((el) => ({ el, spans: [...el.querySelectorAll('span')], lit: -1 }));
  if (blocks.length) {
    if (reduced) {
      for (const block of blocks) for (const span of block.spans) span.classList.add('is-lit');
    } else {
      let frame = 0;
      const paint = () => {
        frame = 0;
        const vh = window.innerHeight;
        for (const block of blocks) {
          const rect = block.el.getBoundingClientRect();
          if (rect.bottom < -vh || rect.top > vh * 2) continue;
          const progress = (vh * 0.86 - rect.top) / (rect.height + vh * 0.36);
          const lit = Math.round(Math.min(1, Math.max(0, progress)) * block.spans.length);
          if (lit === block.lit) continue;
          block.spans.forEach((span, i) => span.classList.toggle('is-lit', i < lit));
          block.lit = lit;
        }
      };
      const request = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };
      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', request);
      paint();
    }
  }

  // --- Kategoriya qatori: kichik rasm sichqoncha ortidan yuradi
  for (const row of document.querySelectorAll('[data-index-row]')) {
    row.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = row.getBoundingClientRect();
      row.style.setProperty('--x', `${Math.round(event.clientX - rect.left)}px`);
    });
  }

  // --- Rasmlar yuklangach silliq ko'rinadi
  for (const img of document.querySelectorAll('img[loading="lazy"]')) {
    if (img.complete) continue;
    img.classList.add('is-pending');
    const done = () => img.classList.remove('is-pending');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }
}
