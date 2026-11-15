import { html, raw, attrs } from '../../lib/html.js';
import { wordmark } from '../../site/brand.js';
import { ic } from '../icons.js';
import { authShell } from '../layout.js';

/**
 * @param {{ error?: string, next?: string, configured?: boolean, blocked?: boolean }} state
 */
export function loginPage({ error = '', next = '', configured = true, blocked = false } = {}) {
  const disabled = !configured || blocked;
  return authShell({
    title: 'Kirish',
    body: html`<main class="auth">
  <div class="auth__bg" aria-hidden="true"><div class="auth__grid"></div><div class="auth__glow"></div></div>
  <form class="auth__card" method="post" action="/admin/login" data-login novalidate>
    <a class="auth__brand" href="/" aria-label="LOOTBOX sayti">${wordmark('lootbox', { className: 'auth__wm' })}</a>
    <p class="auth__kicker">Admin panel</p>
    <h1 class="auth__title">Xush kelibsiz</h1>
    <p class="auth__text">Davom etish uchun parolni kiriting.</p>
    ${error ? html`<p class="alert alert--danger" role="alert">${ic('alert')}<span>${error}</span></p>` : ''}
    <div class="field">
      <label class="field__label" for="password">Parol</label>
      <div class="field__control has-suffix">
        <input${attrs({
          class: 'input', id: 'password', name: 'password', type: 'password', autocomplete: 'current-password',
          required: true, autofocus: !disabled, disabled, maxlength: 200,
        })}>
        <button class="field__toggle" type="button" data-toggle-password aria-label="Parolni ko‘rsatish" aria-pressed="false">${ic('eye')}</button>
      </div>
    </div>
    <input type="hidden" name="next" value="${next}">
    <button class="btn btn--primary btn--lg btn--block" type="submit"${disabled ? raw(' disabled') : ''}>${ic('lock')}<span>Kirish</span></button>
    <p class="auth__hint">Parol loyiha papkasidagi <code>.env</code> faylida turadi: <code>ADMIN_PASSWORD</code> qatori.</p>
  </form>
</main>`,
  });
}
