// Rasm o'rnidagi chizmalar. Tovarga hali rasm yuklanmagan bo'lsa, kategoriyasiga mos
// chizma ko'rsatiladi — sayt bo'sh ko'rinmaydi. Rasm yuklangach, chizma o'rnini rasm egallaydi.
//
// Har bir chizma 200×200 maydonda. Sinflar (ranglari shared/art.css da):
//   s   — asosiy chiziq        a  — urg'u rangidagi chiziq    af — urg'u rangida to'ldirilgan
//   sf  — xira to'ldirilgan    d  — xira yordamchi chiziq     cut — fon rangidagi chiziq
//   g   — kiyim tanasi (FIT)   glow — nur
import { html, raw } from '../lib/html.js';

function keyboardKeys() {
  let out = '';
  const accent = new Set(['1-1', '2-0', '2-1', '2-2']); // WASD
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const x = 27 + col * 15 + row * 3;
      if (x + 11 > 176) continue;
      const cls = accent.has(`${row}-${col}`) ? 'af' : 'd';
      out += `<rect class="${cls}" x="${x}" y="${73 + row * 15}" width="11" height="11" rx="2.5"/>`;
    }
  }
  return out + '<rect class="a" x="62" y="119" width="76" height="11" rx="3"/>';
}

const GLYPHS = {
  // ---------------- LOOTBOX ----------------
  skates: {
    label: 'Sichqoncha glaydlari',
    brand: 'lootbox',
    svg: `
      <path class="sf s" d="M100 20c30 0 48 22 48 58v46c0 34-20 56-48 56s-48-22-48-56V78c0-36 18-58 48-58z"/>
      <path class="af" d="M74 44c8-9 17-13 26-13s18 4 26 13l-7 9c-6-6-12-9-19-9s-13 3-19 9z"/>
      <path class="af" d="M70 152c8 11 18 17 30 17s22-6 30-17l-8-8c-6 8-13 12-22 12s-16-4-22-12z"/>
      <circle class="a" cx="100" cy="98" r="16" stroke-dasharray="5 6"/>
      <circle class="s" cx="100" cy="98" r="6"/>
      <path class="d" d="M14 78h22M6 100h28M14 122h22"/>`,
  },
  switch: {
    label: 'Klaviatura svitchi',
    brand: 'lootbox',
    svg: `
      <rect class="af" x="80" y="20" width="40" height="36" rx="6"/>
      <path class="cut" d="M100 28v20M90 38h20" stroke-width="5"/>
      <path class="sf s" d="M62 60h76l14 46H48z"/>
      <rect class="s" x="40" y="106" width="120" height="42" rx="8"/>
      <path class="d" d="M84 122h32"/>
      <path class="s" d="M78 148v24M122 148v18"/>
      <rect class="a" x="92" y="148" width="16" height="12" rx="3"/>
      <path class="d" d="M22 34v28m-7-9l7 9 7-9M178 34v28m-7-9l7 9 7-9"/>`,
  },
  mousepad: {
    label: 'Mousepad',
    brand: 'lootbox',
    svg: `
      <rect class="sf s" x="16" y="50" width="168" height="104" rx="13"/>
      <rect class="a" x="26" y="60" width="148" height="84" rx="7" stroke-dasharray="3 6" stroke-width="2"/>
      <path class="a" d="M40 128c22-36 40 6 62-22 6-8 11-12 19-13" stroke-width="2.5"/>
      <path class="s cutfill" d="M142 82c10 0 17 8 17 19v14c0 11-7 19-17 19s-17-8-17-19v-14c0-11 7-19 17-19z"/>
      <path class="s" d="M142 82v20"/>
      <path class="d" d="M40 76h44M40 88h28"/>`,
  },
  grip: {
    label: 'Grip lenta',
    brand: 'lootbox',
    svg: `
      <path class="sf s" d="M100 22c28 0 44 20 44 54v50c0 32-18 52-44 52s-44-20-44-52V76c0-34 16-54 44-54z"/>
      <path class="s" d="M100 22v54M56 84c14 6 29 9 44 9s30-3 44-9"/>
      <rect class="a" x="94" y="38" width="12" height="24" rx="6"/>
      <path class="af" d="M56 98c5 3 10 5 14 6v50c-9-6-14-16-14-28zM144 98c-5 3-10 5-14 6v50c9-6 14-16 14-28z"/>
      <path class="cut" d="M60 110l7 5M60 120l7 5M60 130l7 5M62 140l5 4M140 110l-7 5M140 120l-7 5M140 130l-7 5M138 140l-5 4" stroke-width="2"/>`,
  },
  lightbar: {
    label: 'Monitor yoritgichi',
    brand: 'lootbox',
    svg: `
      <path class="glow" d="M58 60l-20 66h124l-20-66z"/>
      <rect class="s" x="30" y="66" width="140" height="86" rx="8"/>
      <path class="s" d="M100 152v18M72 172h56"/>
      <path class="s" d="M100 50V40"/>
      <rect class="af" x="50" y="48" width="100" height="14" rx="7"/>
      <path class="d" d="M46 90h46M46 104h70M46 118h34"/>
      <path class="a" d="M64 72l-5 14M100 72v14M136 72l5 14" stroke-width="2"/>`,
  },
  stand: {
    label: 'Naushnik podstavkasi',
    brand: 'lootbox',
    svg: `
      <path class="s" d="M100 48v120"/>
      <rect class="sf s" x="60" y="166" width="80" height="13" rx="6.5"/>
      <path class="a" d="M52 118V96c0-30 20-50 48-50s48 20 48 50v22" stroke-width="5"/>
      <path class="s" d="M84 46h32" stroke-width="8"/>
      <rect class="af" x="38" y="104" width="27" height="48" rx="12"/>
      <rect class="af" x="135" y="104" width="27" height="48" rx="12"/>
      <path class="cut" d="M51.5 117v22M148.5 117v22" stroke-width="3"/>`,
  },
  projector: {
    label: 'Astronavt proyektor',
    brand: 'lootbox',
    svg: `
      <path class="s" d="M70 112c-10 4-16 13-16 25v35h92v-35c0-12-6-21-16-25"/>
      <path class="s" d="M54 140H43a8 8 0 0 0-8 8v14a8 8 0 0 0 8 8h11M146 140h11a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-11"/>
      <circle class="sf s" cx="100" cy="80" r="37"/>
      <rect class="af" x="75" y="64" width="50" height="32" rx="15"/>
      <path class="cut" d="M86 75q6-5 14-5" stroke-width="3"/>
      <rect class="a" x="84" y="132" width="32" height="20" rx="5"/>
      <path class="af" d="M28 30l3 9 9 3-9 3-3 9-3-9-9-3 9-3zM172 20l2 7 7 2-7 2-2 7-2-7-7-2 7-2zM178 96l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>
      <circle class="af" cx="24" cy="98" r="3"/><circle class="af" cx="152" cy="50" r="2.5"/>`,
  },
  warmer: {
    label: 'Qo‘l isitgich',
    brand: 'lootbox',
    svg: `
      <path class="a" d="M70 46c-6-7 6-11 0-18M100 42c-6-7 6-11 0-18M130 46c-6-7 6-11 0-18" stroke-width="2.5"/>
      <g transform="rotate(-9 78 114)">
        <rect class="sf s" x="50" y="64" width="56" height="100" rx="27"/>
        <circle class="a" cx="78" cy="94" r="9"/>
        <path class="d" d="M70 130h16M70 141h16"/>
      </g>
      <g transform="rotate(9 122 114)">
        <rect class="s cutfill" x="94" y="64" width="56" height="100" rx="27"/>
        <path class="af" d="M123 88c7 8 10 14 10 20a10 10 0 0 1-20 0c0-4 2-7 4-10 1 4 3 5 5 5 0-6-1-10 1-15z"/>
        <path class="d" d="M114 141h16"/>
      </g>`,
  },
  keyboard: {
    label: 'Klaviatura',
    brand: 'lootbox',
    svg: `
      <rect class="sf s" x="16" y="60" width="168" height="82" rx="11"/>
      ${keyboardKeys()}`,
  },
  box: {
    label: 'Quti (umumiy)',
    brand: 'lootbox',
    svg: `
      <path class="a" d="M100 50V22M74 56L62 34M126 56l12-22M54 68L34 54M146 68l20-14" stroke-width="2.5"/>
      <path class="sf s" d="M100 66l62 30v58l-62 30-62-30V96z"/>
      <path class="af" d="M100 76l42 20-42 20-42-20z"/>
      <path class="s" d="M38 96l62 30 62-30M100 126v58"/>`,
  },
  // ---------------- LOOTBOX FIT ----------------
  tee: {
    label: 'Futbolka',
    brand: 'fit',
    svg: `
      <path class="g s" d="M72 34l-36 16-24 34 24 16 14-16v84h100V84l14 16 24-16-24-34-36-16c-4 12-14 18-28 18s-24-6-28-18z"/>
      <path class="gd" d="M72 34c5 7 15 11 28 11s23-4 28-11"/>
      <rect class="af" x="114" y="80" width="18" height="6" rx="2"/>`,
  },
  hoodie: {
    label: 'Xudi',
    brand: 'fit',
    svg: `
      <path class="g s" d="M72 44c-5-19 8-32 28-32s33 13 28 32"/>
      <path class="g s" d="M72 42L44 54 22 150l22 6 14-64v80h84V92l14 64 22-6-22-96-28-12c-4 10-14 16-28 16s-24-6-28-16z"/>
      <path class="gd" d="M76 132h48l8 30H68zM58 163h84M25 141l22 6M175 141l-22 6M83 42c2-11 8-17 17-17s15 6 17 17"/>
      <path class="a" d="M92 60v26M108 60v26"/>`,
  },
  joggers: {
    label: 'Shim',
    brand: 'fit',
    svg: `
      <path class="g s" d="M62 22h76l12 154h-38l-12-96-12 96H50z"/>
      <path class="gd" d="M61 38h78M52 162h36M112 162h36"/>
      <path class="a" d="M94 38v20M106 38v20"/>
      <rect class="af" x="118" y="60" width="16" height="6" rx="2"/>`,
  },
  shorts: {
    label: 'Shorti',
    brand: 'fit',
    svg: `
      <path class="g s" d="M52 46h96l14 94h-52l-10-46-10 46H38z"/>
      <path class="gd" d="M50 62h100"/>
      <path class="a" d="M94 62v18M106 62v18"/>
      <rect class="af" x="124" y="112" width="16" height="6" rx="2"/>`,
  },
  cap: {
    label: 'Kepka',
    brand: 'fit',
    svg: `
      <path class="g s" d="M34 124C32 82 64 54 102 54c34 0 58 24 62 62-32-3-92 1-130 8z"/>
      <path class="af" d="M112 119c24-6 66-6 80 13-28-7-54-9-80-5z"/>
      <path class="gd" d="M102 54c-7 24-9 46-9 66M102 54c8 20 12 40 12 62"/>
      <circle class="af" cx="102" cy="54" r="5"/>`,
  },
  socks: {
    label: 'Paypoq',
    brand: 'fit',
    svg: `
      <path class="g s" d="M70 24h46v72l36 32c9 8 10 22 2 31s-22 9-31 1L70 120z"/>
      <path class="a" d="M70 40h46M70 52h46" stroke-width="4"/>
      <path class="gd" d="M70 96c12 2 22 8 30 18"/>`,
  },
};

export const ART_KEYS = Object.keys(GLYPHS);
export const ART_OPTIONS = ART_KEYS.map((key) => ({ key, label: GLYPHS[key].label, brand: GLYPHS[key].brand }));
export const isArtKey = (key) => Object.hasOwn(GLYPHS, key);

/** Chizma SVG'si. Noma'lum kalit bo'lsa — umumiy "quti". */
export function artSvg(key, className = 'art__svg') {
  const glyph = GLYPHS[isArtKey(key) ? key : 'box'];
  return html`<svg class="${className}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">${raw(glyph.svg)}</svg>`;
}

// ---- Ranglar ---------------------------------------------------------------
// LOOTBOX: to'q fon ustida yorqin chiziq. FIT: och rangli fon ustida kiyim silueti.

export const TONES = {
  lootbox: [
    { key: 'volt', color: '#d4ff3a' },
    { key: 'cyan', color: '#4fe3ff' },
    { key: 'violet', color: '#a58bff' },
    { key: 'pink', color: '#ff5fb0' },
    { key: 'orange', color: '#ff9447' },
    { key: 'ice', color: '#c9d6ff' },
  ],
  fit: [
    { key: 'sand', color: '#ff4b1f', bg: '#e6ded0', garment: '#1d1d20', line: '#111112' },
    { key: 'sage', color: '#ff4b1f', bg: '#d5dccb', garment: '#fbfaf6', line: '#111112' },
    { key: 'sky', color: '#ff4b1f', bg: '#d2dce8', garment: '#27375a', line: '#111112' },
    { key: 'ink', color: '#ff4b1f', bg: '#1c1c1f', garment: '#ece8df', line: '#f3f0ea' },
    { key: 'clay', color: '#111112', bg: '#e8d2c5', garment: '#9a452e', line: '#111112' },
    { key: 'stone', color: '#ff4b1f', bg: '#dad8d2', garment: '#7d7c75', line: '#111112' },
  ],
};

export const TONE_KEYS = [...TONES.lootbox, ...TONES.fit].map((tone) => tone.key);

/** Rang tanlash: aniq kalit berilsa o'sha, bo'lmasa tartib raqami (id) bo'yicha navbat bilan. */
export function toneFor(brand, seed = 0, key = '') {
  const list = TONES[brand === 'fit' ? 'fit' : 'lootbox'];
  const exact = key && list.find((tone) => tone.key === key);
  if (exact) return exact;
  const index = Math.abs(Math.trunc(Number(seed) || 0) - 1) % list.length;
  return list[index];
}

/** style="" uchun CSS o'zgaruvchilari */
export function toneStyle(tone) {
  if (tone.bg) {
    return `--tone:${tone.color};--art-bg:${tone.bg};--art-line:${tone.line};--art-garment:${tone.garment}`;
  }
  return `--tone:${tone.color};--art-bg:color-mix(in oklab, ${tone.color} 8%, #101012);--art-line:#f5f4ef;--art-garment:#f5f4ef`;
}
