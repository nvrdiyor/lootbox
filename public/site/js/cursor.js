// Karusel ustida sichqoncha yonida "← Suring →" yozuvi chiqadi (faqat kompyuterda).
export function initCursor() {
  const chip = document.querySelector('[data-cursor-el]');
  if (!chip || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let frame = 0;
  let x = 0;
  let y = 0;
  let shown = false;

  const show = (on) => {
    if (on === shown) return;
    shown = on;
    chip.classList.toggle('is-on', on);
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    const zone = event.target.closest?.('[data-cursor="drag"]');
    // Tugma va havolalar ustida yozuv xalaqit bermasin
    const busy = event.target.closest?.('button, .btn, .card__cta, .hero__nav');
    show(Boolean(zone) && !busy);
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        chip.style.setProperty('--cx', `${x}px`);
        chip.style.setProperty('--cy', `${y}px`);
      });
    }
  }, { passive: true });

  document.addEventListener('pointerdown', () => chip.classList.add('is-down'));
  document.addEventListener('pointerup', () => chip.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => show(false));
  window.addEventListener('scroll', () => show(false), { passive: true });
}
