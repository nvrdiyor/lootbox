// Tepa panel: scroll'da yashirinish/ko'rinish, mobil menyu, kategoriyalar ro'yxati.
export function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const root = document.documentElement;

  // --- Scroll: pastga — yashirinadi, yuqoriga — qaytadi
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 24);
    const hide = y > 420 && y > lastY + 4;
    const show = y < lastY - 4 || y <= 420;
    if (hide) header.classList.add('is-hidden');
    else if (show) header.classList.remove('is-hidden');
    root.classList.toggle('header-hidden', header.classList.contains('is-hidden'));
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // --- Mobil menyu
  const menu = document.querySelector('[data-menu]');
  const toggle = header.querySelector('[data-menu-toggle]');
  if (menu && toggle) {
    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      header.classList.toggle('is-menu', open);
      root.classList.toggle('is-locked', open);
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      // Menyu ochiq paytda klaviatura bilan uning ortidagi sahifaga o'tib ketilmasin
      for (const behind of document.querySelectorAll('main, footer')) behind.inert = open;
      if (open) menu.querySelector('a')?.focus({ preventScroll: true });
    };
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // --- Kategoriyalar ro'yxati (bosilganda ham ochiladi — sensorli ekranlar uchun)
  for (const drop of header.querySelectorAll('[data-drop]')) {
    const button = drop.querySelector('[data-drop-toggle]');
    const setOpen = (open) => {
      drop.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(!drop.classList.contains('is-open')));
    drop.addEventListener('mouseenter', () => button.setAttribute('aria-expanded', 'true'));
    drop.addEventListener('mouseleave', () => setOpen(false));
    document.addEventListener('click', (event) => {
      if (!drop.contains(event.target)) setOpen(false);
    });
    // Klaviatura bilan ro'yxatdan chiqib ketilsa — yopiladi
    drop.addEventListener('focusout', (event) => {
      if (!drop.contains(event.relatedTarget)) setOpen(false);
    });
    drop.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.focus();
      }
    });
  }
}
