// Brend belgilari: LOOTBOX so'z-logotipi va quti belgisi.
//
// O'Z LOGOTIPINGIZNI QO'YISH: logotip faylini (SVG yoki PNG) public/brand/ papkasiga
//   logo-lootbox.svg  va  logo-fit.svg   (yoki .png)
// nomi bilan tashlang — sayt chizilgan so'z-logotip o'rniga o'sha fayllarni ko'rsatadi.
// Boshqa hech narsani o'zgartirish shart emas.
import fs from 'node:fs';
import path from 'node:path';
import { html, raw } from '../lib/html.js';
import { config } from '../config.js';
import { LOOTBOX_LETTERS, FIT_LETTERS } from './wordmark-data.js';

export const BRANDS = {
  lootbox: {
    key: 'lootbox',
    name: 'LOOTBOX',
    short: 'LOOTBOX',
    home: '/',
    catalog: '/katalog',
    themeColor: '#0b0b0c',
    other: 'fit',
  },
  fit: {
    key: 'fit',
    name: 'LOOTBOX FIT',
    short: 'FIT',
    home: '/fit',
    catalog: '/fit/katalog',
    themeColor: '#f3f0ea',
    other: 'lootbox',
  },
};

export const brandOf = (key) => BRANDS[key === 'fit' ? 'fit' : 'lootbox'];

const LOGO_EXTENSIONS = ['svg', 'png', 'webp'];
let customLogos = null;

/** public/brand/ ichida egasi qo'ygan logotip bormi */
export function customLogo(brandKey) {
  if (!customLogos || config.dev) {
    customLogos = {};
    for (const key of Object.keys(BRANDS)) {
      for (const ext of LOGO_EXTENSIONS) {
        const file = `logo-${key}.${ext}`;
        if (fs.existsSync(path.join(config.publicDir, 'brand', file))) {
          customLogos[key] = `/static/brand/${file}`;
          break;
        }
      }
    }
  }
  return customLogos[brandKey] || null;
}

const letterPaths = (letters, offset = 0) =>
  letters.map(
    (letter, i) => html`<path class="wm__l${letter.ch === 'X' ? ' wm__l--x' : ''}" style="--i:${i + offset}" d="${letter.d}"/>`,
  );

/**
 * So'z-logotip.
 * part: 'lootbox' — faqat LOOTBOX, 'fit' — faqat FIT bo'lagi, 'full' — LOOTBOX FIT birga.
 */
export function wordmark(part = 'lootbox', { className = '', label = '' } = {}) {
  const cls = `wm wm--${part}${className ? ` ${className}` : ''}`;
  const aria = label ? raw(` role="img" aria-label="${label}"`) : raw(' aria-hidden="true"');
  if (part === 'fit') {
    return html`<svg class="${cls}" viewBox="5 -78 215 81"${aria} focusable="false"><g transform="skewX(-12)" class="wm__fit">${letterPaths(FIT_LETTERS)}</g></svg>`;
  }
  if (part === 'full') {
    return html`<svg class="${cls}" viewBox="5 -78 890 81"${aria} focusable="false">${letterPaths(LOOTBOX_LETTERS)}<g transform="translate(675 0) skewX(-12)" class="wm__fit">${letterPaths(FIT_LETTERS, 7)}</g></svg>`;
  }
  return html`<svg class="${cls}" viewBox="5 -78 651.5 81"${aria} focusable="false">${letterPaths(LOOTBOX_LETTERS)}</svg>`;
}

/** Quti belgisi (favicon va kichik joylar uchun) */
export function boxMark(className = 'mark') {
  return html`<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path class="mark__top" d="M32 10l19 10.5L32 31 13 20.5z"/>
    <path class="mark__left" d="M13 24.5l17 9.4V55L13 45.6z"/>
    <path class="mark__right" d="M51 24.5l-17 9.4V55l17-9.4z"/>
  </svg>`;
}

export function faviconSvg(brandKey = 'lootbox') {
  const fit = brandKey === 'fit';
  const bg = fit ? '#f3f0ea' : '#0b0b0c';
  const top = fit ? '#ff4b1f' : '#d4ff3a';
  const left = fit ? '#111112' : '#f5f4ef';
  const right = fit ? '#5c5a55' : '#8f8e88';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${bg}"/><path fill="${top}" d="M32 10l19 10.5L32 31 13 20.5z"/><path fill="${left}" d="M13 24.5l17 9.4V55L13 45.6z"/><path fill="${right}" d="M51 24.5l-17 9.4V55l17-9.4z"/></svg>`;
}
