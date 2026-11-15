// Statistika: tovar ko'rilishi va tugma bosilishi sanaladi (admin panelda ko'rinadi).
// Hech qanday shaxsiy ma'lumot yuborilmaydi — faqat tovar raqami va tugma turi.
function send(id, kind) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return;
  const body = JSON.stringify({ id: productId, kind });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    }
  } catch {
    // statistika ishlamasa ham sayt ishlayveradi
  }
}

export function initTracking() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-track]');
    if (!link) return;
    const holder = link.closest('[data-product]');
    if (holder) send(holder.dataset.product, link.dataset.track);
  });

  // Tovar sahifasi ochilganda — bitta sessiyada bir marta sanaladi
  const page = document.querySelector('[data-view-product]');
  if (page) {
    const id = page.dataset.viewProduct;
    const key = `lb-viewed-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage yopiq — baribir sanaymiz
    }
    send(id, 'view');
  }
}
