// Dev rejimi: fayl o'zgarganda sahifani yangilaydi (prod'da bu skript ulanmaydi).
(() => {
  let dropped = false;
  const source = new EventSource('/__dev/events');

  source.addEventListener('open', () => {
    if (dropped) location.reload();
  });
  source.addEventListener('error', () => {
    dropped = true;
  });
  source.addEventListener('reload', () => location.reload());
  source.addEventListener('css', () => {
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const url = new URL(link.href);
      if (url.origin !== location.origin) continue;
      url.searchParams.set('r', Date.now().toString(36));
      link.href = url.toString();
    }
  });
})();
