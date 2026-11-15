// Admin panelning umumiy qismi: serverga so'rov yuborish (CSRF bilan), bildirishnomalar,
// tasdiqlash oynasi, yon menyu, formalar bilan ishlash yordamchilari.
// Har bir sahifa skripti shu fayldan import qiladi (bir marta ishga tushadi).

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const SVG = (body, fill = false) =>
  fill
    ? `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`
    : `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  check: SVG('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  alert: SVG('<path d="M12 4.5 20.5 19h-17z"/><path d="M12 10.5v4M12 16.8v.2"/>'),
  close: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: SVG('<path d="M5 7h14M10 7V5h4v2M7 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7M10 11v5M14 11v5"/>'),
  star: SVG('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.400 2.900 1.100-6.100L3.200 9.400l6.100-.800z"/>', true),
  refresh: SVG('<path d="M19.5 12a7.5 7.5 0 0 1-13 5.100M4.500 12a7.500 7.500 0 0 1 13-5.100"/><path d="M17.500 3.500V7H14M6.500 20.500V17H10"/>'),
};

// ---- Serverga so'rov --------------------------------------------------------

export const csrfToken = () => $('meta[name="csrf-token"]')?.content || '';

let expiredShown = false;
function sessionExpired() {
  if (expiredShown) return;
  expiredShown = true;
  const next = encodeURIComponent(location.pathname + location.search);
  toast('Sessiya tugagan. Qayta kiring.', { type: 'error', duration: 0, action: { label: 'Kirish', href: `/admin/login?next=${next}` } });
}

/**
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string, errors: Record<string,string>|null }>}
 */
export async function api(method, url, body) {
  const options = { method, headers: { 'X-CSRF-Token': csrfToken(), Accept: 'application/json' }, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    return { ok: false, status: 0, data: null, errors: null, error: 'Serverga ulanib bo‘lmadi. Bir necha soniyadan keyin qayta urinib ko‘ring.' };
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (response.status === 401) sessionExpired();
  const ok = response.ok && data !== null && data.ok !== false;
  return {
    ok,
    status: response.status,
    data,
    errors: data?.errors || null,
    error: ok ? '' : data?.error || `Xatolik yuz berdi (${response.status}). Qayta urinib ko‘ring.`,
  };
}

// ---- Bildirishnomalar ---------------------------------------------------------

function toastHost() {
  let host = $('[data-toasts]');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.dataset.toasts = '';
    document.body.append(host);
  }
  // Ochiq oyna (dialog) bo'lsa, bildirishnoma uning ustida ko'rinishi kerak
  const open = $$('dialog[open]').pop();
  const parent = open || document.body;
  if (host.parentElement !== parent) parent.append(host);
  return host;
}

/**
 * @param {string} message
 * @param {{ type?: 'ok'|'error', duration?: number, action?: { label: string, href?: string, onClick?: () => void } }} [options]
 */
export function toast(message, { type = 'ok', duration = 4200, action = null } = {}) {
  const host = toastHost();
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span class="toast__icon">${type === 'error' ? ICONS.alert : ICONS.check}</span><span class="toast__text"></span>`;
  el.querySelector('.toast__text').textContent = message;

  if (action) {
    const link = document.createElement(action.href ? 'a' : 'button');
    link.className = 'toast__action';
    link.textContent = action.label;
    if (action.href) {
      link.href = action.href;
      if (action.newTab) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
    } else {
      link.type = 'button';
      link.addEventListener('click', () => {
        action.onClick?.();
        dismiss();
      });
    }
    el.append(link);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast__close';
  close.setAttribute('aria-label', 'Yopish');
  close.innerHTML = ICONS.close;
  el.append(close);

  let timer = 0;
  function dismiss() {
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  }
  close.addEventListener('click', dismiss);
  if (duration > 0) {
    const wait = type === 'error' ? Math.max(duration, 6500) : duration;
    timer = setTimeout(dismiss, wait);
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 1800); });
  }

  host.append(el);
  while (host.children.length > 4) host.firstElementChild.remove();
  return dismiss;
}

const FLASH_KEY = 'lb-admin-flash';
/** Keyingi sahifa ochilganda ko'rsatiladigan xabar (saqlab, boshqa sahifaga o'tilganda) */
export function flash(message, options = {}) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, options }));
  } catch {
    // sessionStorage yopiq
  }
}
function showFlash() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const { message, options } = JSON.parse(raw);
    if (message) toast(String(message), options || {});
  } catch {
    // buzilgan yozuv
  }
}

// ---- Tasdiqlash oynasi ----------------------------------------------------------

/**
 * @param {{ title: string, text?: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, text = '', confirmLabel = 'Ha', cancelLabel = 'Bekor qilish', danger = true }) {
  const dialog = $('[data-confirm]');
  if (!dialog || typeof dialog.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  $('[data-confirm-title]', dialog).textContent = title;
  const body = $('[data-confirm-text]', dialog);
  body.textContent = text;
  body.hidden = !text;
  const ok = $('[data-confirm-ok]', dialog);
  ok.textContent = confirmLabel;
  ok.className = `btn ${danger ? 'btn--danger' : 'btn--primary'}`;
  $('[data-confirm-cancel]', dialog).textContent = cancelLabel;
  $('[data-confirm-icon]', dialog).classList.toggle('is-plain', !danger);
  dialog.returnValue = '';
  return new Promise((resolve) => {
    const form = $('form', dialog);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      form.removeEventListener('submit', onSubmit);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      resolve(value);
    };
    // Javob tugma bosilgan zahoti olinadi: "close" hodisasi brauzerda keyingi kadrgacha
    // kechikadi, oyna yig'ilgan bo'lsa esa umuman kelmay qolishi mumkin.
    const onSubmit = (event) => finish(event.submitter?.value === 'ok');
    const onCancel = () => finish(false);
    const onClose = () => finish(dialog.returnValue === 'ok');
    form.addEventListener('submit', onSubmit);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

// ---- Formalar -------------------------------------------------------------------

/** Formadagi nomli maydonlarni obyektga yig'adi (belgilash katakchasi → true/false) */
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'file' || el.type === 'submit' || el.type === 'button') continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

export function clearErrors(root) {
  for (const field of $$('.is-invalid', root)) clearFieldError(field);
}

function clearFieldError(field) {
  field.classList.remove('is-invalid');
  const slot = $('[data-error]', field);
  if (slot) {
    slot.hidden = true;
    slot.textContent = '';
  }
  for (const input of $$('[aria-invalid]', field)) input.removeAttribute('aria-invalid');
}

/**
 * Server qaytargan xatolarni maydonlar ostida ko'rsatadi.
 * @returns {string[]} maydoni topilmagan xabarlar
 */
export function showErrors(root, errors, { focus = true } = {}) {
  clearErrors(root);
  const loose = [];
  let first = null;
  for (const [name, message] of Object.entries(errors || {})) {
    const field = $(`[data-field="${CSS.escape(name)}"]`, root);
    const slot = field && $('[data-error]', field);
    if (!field || !slot) {
      loose.push(message);
      continue;
    }
    field.classList.add('is-invalid');
    slot.textContent = message;
    slot.hidden = false;
    const input = $('input:not([type="hidden"]), textarea, select', field);
    input?.setAttribute('aria-invalid', 'true');
    first ||= field;
  }
  if (first && focus) {
    first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    $('input:not([type="hidden"]):not([type="radio"]), textarea, select', first)?.focus({ preventScroll: true });
  }
  return loose;
}

export function setLoading(button, on) {
  if (!button) return;
  button.classList.toggle('is-loading', on);
  button.disabled = on;
}

export function debounce(fn, ms) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** 129000 → "129 000" */
export function groupDigits(value) {
  return String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function pageData() {
  try {
    return JSON.parse($('#page-data')?.textContent || '{}');
  } catch {
    return {};
  }
}

/** Demo ma'lumotni o'chirish tugmasi (bosh sahifa va sozlamalarda bir xil) */
export function bindClearDemo() {
  for (const button of $$('[data-clear-demo]')) {
    button.addEventListener('click', async () => {
      const yes = await confirmDialog({
        title: 'Demo ma’lumot o‘chirilsinmi?',
        text: 'Namuna tovarlar, slaydlar va bo‘sh demo kategoriyalar butunlay o‘chadi. O‘zingiz qo‘shgan tovarlarga tegilmaydi. Bu amalni ortga qaytarib bo‘lmaydi.',
        confirmLabel: 'O‘chirish',
      });
      if (!yes) return;
      setLoading(button, true);
      const result = await api('POST', '/admin/api/demo/clear');
      setLoading(button, false);
      if (!result.ok) return toast(result.error, { type: 'error' });
      const removed = result.data.removed;
      flash(`Demo o‘chirildi: ${removed.products} ta tovar, ${removed.slides} ta slayd, ${removed.categories} ta kategoriya.`);
      location.reload();
    });
  }
}

// ---- Qobiq: yon menyu, chiqish, umumiy mayda ishlar ---------------------------------

function initShell() {
  const side = $('[data-side]');
  const opener = $('[data-side-open]');
  const scrim = $('.scrim');
  if (side && opener) {
    const setOpen = (open) => {
      side.classList.toggle('is-open', open);
      opener.setAttribute('aria-expanded', String(open));
      if (scrim) scrim.hidden = !open;
      document.documentElement.classList.toggle('is-locked', open);
      if (open) $('.side__link', side)?.focus({ preventScroll: true });
    };
    opener.addEventListener('click', () => setOpen(true));
    for (const closer of $$('[data-side-close]')) closer.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && side.classList.contains('is-open')) {
        setOpen(false);
        opener.focus();
      }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  for (const button of $$('[data-logout]')) {
    button.addEventListener('click', async () => {
      button.disabled = true;
      await api('POST', '/admin/logout');
      location.assign('/admin/login');
    });
  }

  // Belgilar hisoblagichi: "128 / 600"
  for (const counter of $$('[data-count-for]')) {
    const input = document.getElementById(counter.dataset.countFor);
    if (!input) continue;
    const max = Number(input.getAttribute('maxlength')) || 0;
    const update = () => {
      counter.textContent = max ? `${input.value.length} / ${max}` : String(input.value.length);
      counter.classList.toggle('is-over', Boolean(max) && input.value.length >= max);
    };
    input.addEventListener('input', update);
    update();
  }

  // Xato ko'rsatilgan maydon o'zgartirilsa, xato yozuvi yo'qoladi
  document.addEventListener('input', (event) => {
    const field = event.target.closest?.('.field.is-invalid');
    if (field) clearFieldError(field);
  });
  document.addEventListener('change', (event) => {
    const field = event.target.closest?.('.field.is-invalid');
    if (field) clearFieldError(field);
  });

  if ($('[data-savebar]')) document.body.classList.add('has-savebar');
  showFlash();
}

initShell();
