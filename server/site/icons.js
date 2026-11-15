// Kichik ikonkalar to'plami (24×24, chiziqli). icon('arrow-right')
import { html, raw } from '../lib/html.js';

const STROKE = {
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  'arrow-down': '<path d="M12 4v15M6 13l6 6 6-6"/>',
  'arrow-up': '<path d="M12 20V5M6 11l6-6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  sort: '<path d="M7 5v14M3.5 15.5 7 19l3.5-3.5M17 19V5M13.5 8.5 17 5l3.5 3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8v6M8 11h6"/>',
  bag: '<path d="M5.5 8.5h13l-1 11h-11l-1-11Z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  share: '<path d="M12 15V4M8 7.5 12 4l4 3.5"/><path d="M6 11v8h12v-8"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.6" cy="7.4" r=".6" fill="currentColor"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10.5 9.5 4 2.5-4 2.5v-5Z" fill="currentColor"/>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.4 2 4 4.5 4.3"/>',
  chat: '<path d="M5 6.5h14v9.5H11l-4 3.5V16H5V6.5Z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
};

const FILL = {
  telegram:
    '<path d="M21.7 3.3 2.9 10.6a.8.8 0 0 0 0 1.5l4.8 1.6 1.8 5.7a.8.8 0 0 0 1.4.3l2.7-3 4.7 3.5a.8.8 0 0 0 1.3-.5L22.8 4.2a.8.8 0 0 0-1.1-.9ZM9.7 14.6l8-6.6-6.3 7.6-.4 3-1.3-4Z"/>',
  star: '<path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/>',
};

export function icon(name, className = 'icon') {
  if (FILL[name]) {
    return html`<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${raw(FILL[name])}</svg>`;
  }
  const body = STROKE[name] || STROKE['arrow-right'];
  return html`<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(body)}</svg>`;
}

/** Yo'nalish turiga mos ikonka */
export const destIcon = (type) => (type === 'uzum' ? 'bag' : type === 'dm' ? 'chat' : 'telegram');
