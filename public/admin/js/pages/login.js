// Kirish sahifasi: parolni ko'rsatish/yashirish, yuborilayotganda tugma holati.
const form = document.querySelector('[data-login]');
if (form) {
  const input = form.querySelector('#password');
  const toggle = form.querySelector('[data-toggle-password]');
  toggle?.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Parolni yashirish' : 'Parolni ko‘rsatish');
    input.focus();
  });

  form.addEventListener('submit', (event) => {
    if (!input.value) {
      event.preventDefault();
      input.focus();
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    // Tugma o'chirilsa ham forma yuboriladi (qiymati kerak emas)
    requestAnimationFrame(() => {
      button.classList.add('is-loading');
      button.disabled = true;
    });
  });
}
