// Kichik HTML shablon yordamchisi: html`...` ichiga qo'yilgan har qanday qiymat
// avtomatik ekranlanadi (XSS'dan himoya). Tayyor HTML bo'lagini qo'yish uchun
// boshqa html`...` natijasini yoki raw() ni ishlating.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Ishonchli (o'zimiz yozgan) HTML — ekranlanmaydi. Foydalanuvchi matni uchun ISHLATMANG. */
export const raw = (value) => new SafeHtml(value == null ? '' : String(value));

function render(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) {
    let out = '';
    for (const item of value) out += render(item);
    return out;
  }
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** class nomlarini yig'adi: cx('a', cond && 'b') */
export const cx = (...parts) => parts.flat().filter(Boolean).join(' ');

/** Atributlar: attrs({ hidden: true, 'data-id': 5, title: null }) → ` hidden data-id="5"` */
export function attrs(map) {
  let out = '';
  for (const [name, value] of Object.entries(map)) {
    if (value == null || value === false) continue;
    out += value === true ? ` ${name}` : ` ${name}="${esc(value)}"`;
  }
  return raw(out);
}

// JSON ichida HTML'ni buzishi mumkin bo'lgan belgilar (kodlari bilan yozilgan,
// chunki ba'zilari manba faylda ko'rinmas bo'ladi).
const JSON_UNSAFE = new Map(
  [0x3c, 0x3e, 0x26, 0x2028, 0x2029].map((code) => [
    String.fromCharCode(code),
    '\\u' + code.toString(16).padStart(4, '0'),
  ]),
);

/** <script type="application/json"> ichiga xavfsiz JSON */
export function jsonScript(data) {
  let out = '';
  for (const ch of JSON.stringify(data)) out += JSON_UNSAFE.get(ch) ?? ch;
  return raw(out);
}

/** Oddiy matnni paragraflarga bo'ladi (bo'sh qator = yangi paragraf, Enter = <br>). */
export function paragraphs(text, className = '') {
  const blocks = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const parts = [];
    lines.forEach((line, i) => {
      if (i) parts.push(raw('<br>'));
      parts.push(line);
    });
    return html`<p${attrs({ class: className || null })}>${parts}</p>`;
  });
}
