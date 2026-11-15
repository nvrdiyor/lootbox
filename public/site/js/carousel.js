// Karusel: telefonda barmoq bilan (brauzerning o'z silliq scroll'i), kompyuterda
// sichqoncha bilan tortish + tugmalar. Pastdagi chiziq qayerda turganini ko'rsatadi.
//
// Silliq surilishni o'zimiz chizamiz (requestAnimationFrame): Windows'da tizim animatsiyalari
// o'chirilgan bo'lsa, brauzerning tayyor "smooth" scroll'i sakrab o'tadi.
export function initCarousels() {
  for (const root of document.querySelectorAll('[data-carousel]')) setup(root);
}

function setup(root) {
  const track = root.querySelector('[data-carousel-track]');
  if (!track) return;
  const box = track.closest('.carousel') || root;
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const bar = root.querySelector('[data-carousel-bar]');
  const progress = bar?.parentElement;
  const calm = document.documentElement.classList.contains('calm');

  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

  const update = () => {
    const max = maxScroll();
    const p = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
    if (bar) {
      bar.style.setProperty('--p', p.toFixed(4));
      bar.style.setProperty('--w', `${Math.max(8, (track.clientWidth / track.scrollWidth) * 100).toFixed(2)}%`);
      progress.classList.toggle('is-full', max <= 1);
    }
    if (prev) prev.disabled = track.scrollLeft <= 1;
    if (next) next.disabled = track.scrollLeft >= max - 1;
  };

  let frame = 0;
  track.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  }, { passive: true });
  new ResizeObserver(update).observe(track);
  update();

  let momentum = 0;
  let unlock = 0;

  /** Eng yaqin kartochka boshiga mos scroll qiymati */
  const nearestSnap = (target) => {
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    let best = 0;
    let bestDistance = Infinity;
    for (const item of track.children) {
      const left = item.offsetLeft - pad;
      const distance = Math.abs(left - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = left;
      }
    }
    return Math.min(Math.max(0, best), maxScroll());
  };

  const finish = () => box.classList.remove('is-gliding', 'is-dragging');

  /** Berilgan joyga silliq suradi */
  const glide = (target) => {
    const from = track.scrollLeft;
    const to = Math.min(Math.max(0, target), maxScroll());
    const distance = to - from;
    cancelAnimationFrame(momentum);
    clearTimeout(unlock);
    if (calm || Math.abs(distance) < 1) {
      track.scrollLeft = to;
      finish();
      return;
    }
    const duration = Math.min(900, 360 + Math.abs(distance) * 0.4);
    const started = performance.now();
    box.classList.add('is-gliding');
    // Oyna yashirilsa animatsiya to'xtab qoladi — karusel baribir oddiy holatiga qaytsin
    unlock = setTimeout(finish, duration + 200);
    const tick = (time) => {
      const t = Math.min(1, Math.max(0, (time - started) / duration));
      track.scrollLeft = from + distance * (1 - (1 - t) ** 4);
      if (t < 1) momentum = requestAnimationFrame(tick);
      else {
        clearTimeout(unlock);
        finish();
      }
    };
    momentum = requestAnimationFrame(tick);
  };

  // --- Tugmalar: ko'rinib turgan kartochkalar soniga teng qadam
  const step = () => {
    const item = track.firstElementChild;
    if (!item) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const width = item.getBoundingClientRect().width + gap;
    return Math.max(width, Math.floor(track.clientWidth / width) * width);
  };
  prev?.addEventListener('click', () => glide(nearestSnap(track.scrollLeft - step())));
  next?.addEventListener('click', () => glide(nearestSnap(track.scrollLeft + step())));

  // --- Sichqoncha bilan tortish (sensorli ekranda brauzer o'zi qiladi)
  let down = false;
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    cancelAnimationFrame(momentum);
    clearTimeout(unlock);
    box.classList.remove('is-gliding');
    down = true;
    dragging = false;
    startX = lastX = event.clientX;
    startLeft = track.scrollLeft;
    lastT = performance.now();
    velocity = 0;
  });

  window.addEventListener('pointermove', (event) => {
    if (!down) return;
    const dx = event.clientX - startX;
    if (!dragging && Math.abs(dx) > 6) {
      dragging = true;
      box.classList.add('is-dragging');
    }
    if (!dragging) return;
    const time = performance.now();
    const dt = Math.max(1, time - lastT);
    velocity = velocity * 0.6 + ((lastX - event.clientX) / dt) * 0.4;
    lastX = event.clientX;
    lastT = time;
    track.scrollLeft = startLeft - dx;
  });

  const release = () => {
    if (!down) return;
    down = false;
    // Inersiya bilan qayerga borishini hisoblab, eng yaqin kartochkaga silliq to'xtaydi
    if (dragging) glide(nearestSnap(track.scrollLeft + velocity * 260));
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // Tortgandan keyin havola ochilib ketmasin
  track.addEventListener('click', (event) => {
    if (dragging) {
      event.preventDefault();
      event.stopPropagation();
      dragging = false;
    }
  }, true);
  track.addEventListener('dragstart', (event) => event.preventDefault());
}
