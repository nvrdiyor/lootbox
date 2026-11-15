// Admin panel ikonkalari (24×24). ic('edit')
import { html, raw } from '../lib/html.js';

const STROKE = {
  home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  box: '<path d="M12 3.5 20 8v8l-8 4.5L4 16V8z"/><path d="m4 8 8 4.5L20 8M12 12.5v8"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5L19 17"/>',
  settings: '<path d="M4 7h8M18 7h2M4 17h2M12 17h8M4 12h2M12 12h8"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/><circle cx="9" cy="12" r="2.2"/>',
  external: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  logout: '<path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14 8l4 4-4 4M18 12H9.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  edit: '<path d="M4.5 19.5 5.6 15 16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L9 18.4z"/><path d="m14 6.5 3.5 3.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7M10 11v5M14 11v5"/>',
  eye: '<path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>',
  'eye-off': '<path d="M4 4l16 16M9.9 6.1A9 9 0 0 1 12 5.8c6 0 9.2 6.2 9.2 6.2a15 15 0 0 1-2.6 3.4M6.3 7.7A14.800 14.800 0 0 0 2.800 12S6 18.200 12 18.200a8.800 8.800 0 0 0 3.600-.800M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
  upload: '<path d="M12 15.500V4.500M7.500 8.500 12 4l4.500 4.500"/><path d="M5 14.500v3A1.500 1.500 0 0 0 6.500 19h11a1.500 1.500 0 0 0 1.500-1.500v-3"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 4.500 20.500 19h-17z"/><path d="M12 10.500v4M12 16.800v.200"/>',
  info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.200"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3A4 4 0 0 0 13 5.300l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>',
  bag: '<path d="M5.500 8.500h13l-1 11h-11l-1-11Z"/><path d="M9 8.500V7a3 3 0 0 1 6 0v1.500"/>',
  chat: '<path d="M5 6.500h14V16h-8l-4 3.500V16H5V6.500Z"/>',
  'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-up': '<path d="M12 20V5M6 11l6-6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  lock: '<rect x="5" y="10.500" width="14" height="9.500" rx="2.500"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>',
  chart: '<path d="M5 19v-8M10 19V5M15 19v-6M20 19V9"/>',
  refresh: '<path d="M19.500 12a7.500 7.500 0 0 1-13 5.100M4.500 12a7.500 7.500 0 0 1 13-5.100"/><path d="M17.500 3.500v3.500H14M6.500 20.500V17H10"/>',
  bolt: '<path d="M13 3.500 5.500 13.500h5l-1 7 7.500-10h-5z"/>',
  text: '<path d="M5 6.500h14M5 11h14M5 15.500h9"/>',
  palette: '<path d="M12 4a8 8 0 1 0 0 16c1.400 0 2-.900 2-1.800 0-1.700 1-2.200 2.500-2.200H18a2 2 0 0 0 2-2c0-5.500-3.600-10-8-10z"/><circle cx="8.500" cy="11" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="15.500" cy="10.500" r="1"/>',
};

const FILL = {
  telegram:
    '<path d="M21.700 3.300 2.900 10.600a.800.800 0 0 0 0 1.500l4.800 1.600 1.800 5.700a.800.800 0 0 0 1.400.300l2.700-3 4.700 3.500a.800.800 0 0 0 1.300-.500L22.800 4.200a.800.800 0 0 0-1.100-.900ZM9.700 14.600l8-6.600-6.300 7.600-.400 3-1.300-4Z"/>',
  star: '<path d="m12 3 2.700 5.600 6.100.800-4.500 4.300 1.100 6.100L12 16.900l-5.400 2.900 1.100-6.100L3.200 9.400l6.100-.800z"/>',
  grip: '<circle cx="9" cy="6" r="1.600"/><circle cx="15" cy="6" r="1.600"/><circle cx="9" cy="12" r="1.600"/><circle cx="15" cy="12" r="1.600"/><circle cx="9" cy="18" r="1.600"/><circle cx="15" cy="18" r="1.600"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
};

export function ic(name, className = 'ic') {
  if (FILL[name]) {
    return html`<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${raw(FILL[name])}</svg>`;
  }
  const body = STROKE[name] || STROKE.info;
  return html`<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(body)}</svg>`;
}

/** Yo'nalish turiga mos ikonka */
export const destIc = (type) => (type === 'uzum' ? 'bag' : type === 'dm' ? 'chat' : 'telegram');

/** Mijoz skriptlari uchun (JS ichida innerHTML bilan qo'yiladigan) tayyor SVG matni */
export function iconString(name) {
  return String(ic(name));
}
