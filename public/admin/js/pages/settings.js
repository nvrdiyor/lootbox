// Sozlamalar: saqlash (Ctrl+S), server tuzatgan qiymatlarni maydonlarga qaytarish,
// barcha qurilmalardan chiqish, demo ma'lumotni o'chirish.
import { $, $$, api, toast, confirmDialog, readForm, showErrors, clearErrors, setLoading, bindClearDemo } from '../core.js';
import { trackForm } from '../form-state.js';

const form = $('[data-settings-form]');

if (form) {
  const saveButton = $('[data-save]', form);
  const tracker = trackForm(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveButton.disabled) return;
    clearErrors(form);
    setLoading(saveButton, true);
    const result = await api('PUT', '/admin/api/settings', readForm(form));
    setLoading(saveButton, false);

    if (!result.ok) {
      const loose = showErrors(form, result.errors || {});
      tracker.error('Saqlanmadi. Xatolarni tuzatib, qayta urinib ko‘ring.');
      toast(loose[0] || result.error, { type: 'error' });
      return;
    }

    // Server havolalarni tartibga keltiradi (masalan "t.me/kanal" → "@kanal") — shuni ko'rsatamiz
    const saved = result.data.settings || {};
    for (const element of form.elements) {
      if (!element.name || !Object.hasOwn(saved, element.name)) continue;
      if (element.type === 'checkbox') element.checked = saved[element.name] !== '0';
      else if (element.type === 'radio') element.checked = element.value === saved[element.name];
      else element.value = saved[element.name];
    }
    for (const counted of $$('textarea, input', form)) {
      if (counted.id && $(`[data-count-for="${CSS.escape(counted.id)}"]`, form)) counted.dispatchEvent(new Event('input'));
    }
    tracker.markClean('Saqlandi');
    toast('Sozlamalar saqlandi', { action: { label: 'Saytni ko‘rish', href: '/', newTab: true } });
  });
}

$('[data-end-sessions]')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const yes = await confirmDialog({
    title: 'Barcha qurilmalardan chiqilsinmi?',
    text: 'Hamma ochiq sessiyalar yopiladi. Shu qurilmada ham parolni qayta kiritish kerak bo‘ladi.',
    confirmLabel: 'Chiqish',
  });
  if (!yes) return;
  setLoading(button, true);
  const result = await api('POST', '/admin/api/sessions/end-all');
  if (!result.ok) {
    setLoading(button, false);
    toast(result.error, { type: 'error' });
    return;
  }
  location.assign('/admin/login');
});

bindClearDemo();

// Chapdagi bo'limlar ro'yxatida hozir ko'rinib turgan bo'lim belgilanadi
const links = $$('.settings__nav a');
if (links.length && 'IntersectionObserver' in window) {
  const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) link.classList.remove('is-active');
        byId.get(entry.target.id)?.classList.add('is-active');
      }
    },
    { rootMargin: '-20% 0px -65% 0px' },
  );
  for (const id of byId.keys()) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}
