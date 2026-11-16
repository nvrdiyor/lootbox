// Tovar rasmlarini fonsiz qilish:  npm run cutouts                 — hammasini qaytadan yasaydi
//                                  npm run cutouts -- nom ...       — faqat ko'rsatilganlarini
//                                  npm run cutouts -- --check nom   — yozmaydi, tekshirish uchun rasm chiqaradi
// Har bir tovarning manba rasmini (internetdan topilgan toza surat yoki Uzum'dagi o'z e'lonimiz rasmi) fonidan
// ajratib, saytga tayyor fayllarni yozadi: server/db/catalog-media/<nom>.webp (to'liq) va <nom>.t.webp (kichik).
// Nima qayerdan va qanday kesilishi: scripts/cutouts/specs.js. Kesish kompyuterdagi Chrome ichida, hech qanday
// tashqi dastur yoki xizmatsiz bajariladi (scripts/cutouts/page.js).
// Manba rasmlar bir marta yuklab olinadi va data/cutout-src/ da saqlanadi (git'ga tushmaydi).
// Yangi fayllarni bazaga yozish: npm run catalog -- --replace-images
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sniffImage } from '../server/lib/images.js';
import { launchChrome } from './lib/headless.js';
import { SPECS } from './cutouts/specs.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'server', 'db', 'catalog-media');
const CACHE = path.join(ROOT, 'data', 'cutout-src');
const PREVIEW = path.join(ROOT, 'data', 'shots');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const names = args.filter((arg) => !arg.startsWith('--'));
const list = names.length ? names : Object.keys(SPECS);
const unknown = list.filter((name) => !SPECS[name]);
if (unknown.length) {
  console.error(`Bunday ta'rif yo'q: ${unknown.join(', ')}\nBorlari: ${Object.keys(SPECS).join(', ')}`);
  process.exit(1);
}

/** Manba rasmning manzili va keshdagi fayl nomi */
function locate(source) {
  if (typeof source === 'string') {
    if (!/^[a-z0-9]{16,32}$/.test(source)) throw new Error(`Rasm identifikatori noto'g'ri: ${source}`);
    return { url: `https://images.uzum.uz/${source}/original.jpg`, file: `${source}.img` };
  }
  const url = new URL(source?.url || '');
  if (url.protocol !== 'https:') throw new Error(`Manba faqat https bo'lishi kerak: ${source?.url}`);
  return { url: url.href, file: `web-${crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 20)}.img` };
}

/** Manba rasmni oladi (keshda bo'lsa — keshdan). Faqat rasm qabul qilinadi: turi baytlaridan tekshiriladi. */
async function load(source) {
  const { url, file } = locate(source);
  const cached = path.join(CACHE, file);
  if (!fs.existsSync(cached)) {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/webp,image/jpeg,image/png' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`manba yuklanmadi (HTTP ${res.status}): ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024 || !sniffImage(buf)) throw new Error(`manba rasm emas yoki juda katta: ${url}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(cached, buf);
  }
  const buf = fs.readFileSync(cached);
  const info = sniffImage(buf);
  if (!info) throw new Error(`keshdagi fayl rasm emas: ${cached}`);
  return `data:${info.mime};base64,${buf.toString('base64')}`;
}

const chrome = await launchChrome({ port: 9381 });
if (!chrome) {
  console.error('Chrome topilmadi. CHROME_PATH o‘zgaruvchisida yo‘lini ko‘rsating.');
  process.exit(1);
}

let failed = 0;
try {
  await chrome.run(`${fs.readFileSync(path.join(import.meta.dirname, 'cutouts', 'page.js'), 'utf8')}; true`);
  fs.mkdirSync(checkMode ? PREVIEW : OUT, { recursive: true });
  console.log('');
  for (const name of list) {
    try {
      const { source, ...options } = SPECS[name];
      await chrome.run(`window.__src = ${JSON.stringify(await load(source))}; true`);
      const method = options.render === 'pad' ? 'pad' : options.outline ? 'outline' : 'white';
      const reply = JSON.parse(await chrome.run(`CUT.${method}(window.__src, ${JSON.stringify({ ...options, debug: checkMode })})`));

      if (checkMode) {
        const preview = path.join(PREVIEW, `kesim-${name}.jpg`);
        fs.writeFileSync(preview, Buffer.from(reply.preview, 'base64'));
        console.log(`  ${name}: ${preview}`);
        if (reply.strip) {
          const strip = path.join(PREVIEW, `kesim-${name}-chekka.png`);
          fs.writeFileSync(strip, Buffer.from(reply.strip, 'base64'));
          console.log(`  ${' '.repeat(name.length)}  ${strip}`);
        }
        continue;
      }

      // Saytga tayyorlash: admin paneldagi yuklagich bilan bir xil qoida (WebP, kichik nusxa 800 px gacha).
      // `quality: [to'liq, kichik]` — bir tekis to'q sirtli rasmlar (gilamcha) uchun: odatdagi siqishda ularda
      // kvadrat dog'lar paydo bo'ladi.
      const [qFull, qThumb] = (options.quality || [0.9, 0.86]).map(Number);
      const full = JSON.parse(await chrome.run(`CUT.webp(1400, ${qFull})`));
      const thumb = JSON.parse(await chrome.run(`CUT.webp(800, ${qThumb})`));
      fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(full.data, 'base64'));
      fs.writeFileSync(path.join(OUT, `${name}.t.webp`), Buffer.from(thumb.data, 'base64'));
      console.log(`  ${name}: ${full.size}, ${Math.round(fs.statSync(path.join(OUT, `${name}.webp`)).size / 1024)} KB`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }
  console.log(checkMode ? '' : `\n  Fayllar: ${OUT}\n  Bazaga yozish: npm run catalog -- --replace-images\n`);
} finally {
  await chrome.close();
}
process.exit(failed ? 1 : 0);
