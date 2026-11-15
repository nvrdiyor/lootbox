// Tovar sahifasi: rasmlar galereyasi (telefonda surish + nuqtalar), kattalashtirish
// oynasi, pastga yopishgan tugma, havolani ulashish.
export function initProduct() {
  initGallery();
  initBuyBar();
  initShare();
}

function initGallery() {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const items = [...gallery.querySelectorAll('[data-zoom]')];
  const dots = [...document.querySelectorAll('[data-gallery-dot]')];

  if (dots.length) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = items.indexOf(entry.target);
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      }
    }, { root: gallery, threshold: 0.6 });
    for (const item of items) observer.observe(item);
  }

  const box = document.querySelector('[data-lightbox]');
  if (!box || !items.length || typeof box.showModal !== 'function') return;
  const img = box.querySelector('[data-lightbox-img]');
  const count = box.querySelector('[data-lightbox-count]');
  let index = 0;

  const show = (next) => {
    index = (next + items.length) % items.length;
    const source = items[index];
    img.src = source.dataset.zoom;
    img.alt = source.querySelector('img')?.alt || '';
    img.style.animation = 'none';
    void img.offsetWidth;
    img.style.animation = '';
    if (count) count.textContent = `${index + 1} / ${items.length}`;
  };

  items.forEach((item, i) => item.addEventListener('click', () => {
    show(i);
    box.showModal();
  }));
  box.querySelector('[data-lightbox-close]')?.addEventListener('click', () => box.close());
  box.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(index - 1));
  box.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(index + 1));
  let startX = 0;
  let swiped = false;
  box.addEventListener('click', (event) => {
    // Surishdan keyingi "bosish" oynani yopib yubormasin
    if (swiped) {
      swiped = false;
      return;
    }
    if (event.target === box) box.close();
  });
  box.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });

  box.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    swiped = false;
  });
  box.addEventListener('pointerup', (event) => {
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 60 && items.length > 1) {
      swiped = true;
      show(index + (dx < 0 ? 1 : -1));
    }
  });
}

/** Havolani nusxalash. Xavfsiz bo'lmagan manzilda (http://192.168...) eski usul ishlatiladi. */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.append(area);
  area.select();
  let done = false;
  try {
    done = document.execCommand('copy');
  } catch {
    done = false;
  }
  area.remove();
  return done;
}

function initBuyBar() {
  const bar = document.querySelector('[data-buybar]');
  const anchor = document.querySelector('[data-buy-anchor]');
  if (!bar || !anchor || !('IntersectionObserver' in window)) return;
  // Asosiy tugma ekrandan chiqib ketsa — pastki panel ko'rinadi
  new IntersectionObserver(([entry]) => {
    const above = entry.boundingClientRect.top < 0;
    bar.classList.toggle('is-on', !entry.isIntersecting && above);
  }, { threshold: 0 }).observe(anchor);
}

function initShare() {
  const button = document.querySelector('[data-share]');
  if (!button) return;
  const label = button.querySelector('span');
  const original = label?.textContent;
  button.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      if ((await copyText(location.href)) && label) {
        label.textContent = button.dataset.copied || original;
        setTimeout(() => { label.textContent = original; }, 1800);
      }
    } catch {
      // foydalanuvchi bekor qildi
    }
  });
}
