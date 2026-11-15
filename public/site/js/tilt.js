// Rasmli kartochka sichqonchaga qarab biroz og'adi (3D) va ustida yorug'lik dog'i yuradi.
// Faqat sichqonchali qurilmalarda; "tinch" rejimda (boot.js qo'yadigan .calm) ishlamaydi.
export function initTilt() {
  if (document.documentElement.classList.contains('calm')) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let active = null;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const release = () => {
    if (!active) return;
    active.classList.remove('is-tilting');
    active.style.removeProperty('--tx');
    active.style.removeProperty('--ty');
    active = null;
  };

  const apply = () => {
    frame = 0;
    if (!active) return;
    const rect = active.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // -1 … 1: kartochka markazidan chetigacha
    const x = Math.max(-1, Math.min(1, ((pointerX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((pointerY - rect.top) / rect.height - 0.5) * 2));
    active.style.setProperty('--tx', x.toFixed(3));
    active.style.setProperty('--ty', y.toFixed(3));
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target instanceof Element ? event.target.closest('[data-tilt3d]') : null;
    if (target !== active) {
      release();
      active = target;
      if (active) active.classList.add('is-tilting');
    }
    if (!active) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });

  // Sichqoncha oynadan chiqsa yoki sahifa aylantirilsa — kartochka joyiga qaytadi
  document.documentElement.addEventListener('pointerleave', release);
  window.addEventListener('blur', release);
  window.addEventListener('scroll', release, { passive: true });
}
