// Sayt suratlari:  npm run shots
// Ko'rinmas Chrome'ni HAQIQIY vaqt bilan boshqarib, saytning animatsiyali holatini suratga oladi:
// hero kirishi, slayd o'zi almashishi, scroll bo'yicha paydo bo'lish, telefon ko'rinishi.
// Server ishlab turgan bo'lishi kerak (npm run dev). Natija: data/shots/*.jpg (git'ga tushmaydi).
// Nega kerak: oyna yig'ilgan yoki boshqa oyna ortida bo'lsa brauzer kadr chizmaydi va animatsiyani
// oddiy skrinshot bilan tekshirib bo'lmaydi; bu skript unga bog'liq emas.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const base = process.argv[2] || `http://localhost:${process.env.PORT || '3210'}`;
const outDir = path.join(ROOT, 'data', 'shots');
const debugPort = 9377;

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = candidates.find((file) => fs.existsSync(file));
if (!chrome) {
  console.error('Chrome topilmadi. CHROME_PATH o‘zgaruvchisida yo‘lini ko‘rsating.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
// Alohida vaqtinchalik profil: o'zingiz ishlatayotgan Chrome'ga tegilmaydi
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-shots-'));
const browser = spawn(
  chrome,
  ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stop = async (code) => {
  browser.kill();
  await sleep(400);
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(code);
};

let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  await sleep(200);
  try {
    ready = (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok;
  } catch {
    ready = false;
  }
}
if (!ready) {
  console.error('Chrome ishga tushmadi.');
  await stop(1);
}

const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0;
const waiting = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message);
    waiting.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++sequence;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
const run = async (expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
// Suratdan oldin sahifadan navbatdagi kadr kutiladi. Busiz ba'zan (telefon ko'rinishida, menyu ochilgan sahifadan
// keyingi sahifada) surat eski kadrni qaytaradi: sahifa tayyor, lekin tasvir yangilanmagan bo'ladi.
const nextFrame = () =>
  run(`new Promise((resolve) => {
    const timer = setTimeout(resolve, 500);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(true); }));
  })`);
const shot = async (name) => {
  await nextFrame();
  const reply = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  fs.writeFileSync(path.join(outDir, `${name}.jpg`), Buffer.from(reply.result.data, 'base64'));
  console.log(`  ${name}.jpg`);
};
const viewport = (width, height, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const open = (url) => send('Page.navigate', { url: base + url });
const scrollTo = (selector, block = 'start') => run(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: ${JSON.stringify(block)} })`);

try {
  if (!(await fetch(base)).ok) throw new Error('server');
} catch {
  console.error(`Sayt ${base} da javob bermayapti. Avval serverni ishga tushiring: npm run dev`);
  await stop(1);
}

await send('Page.enable');
await send('Runtime.enable');
console.log(`\n  Suratlar: ${outDir}\n`);

// Kompyuter
await viewport(1366, 768);
await open('/');
await sleep(700);
await shot('01-hero-kirish');
await sleep(1800);
await shot('02-hero');
await sleep(5600);
await shot('03-hero-ikkinchi-slayd');
const slide = await run(`[...document.querySelectorAll('[data-hero-slide]')].findIndex((item) => item.classList.contains('is-active'))`);
await scrollTo('#yangi');
await sleep(1800);
await shot('04-yangi-kelganlar');
await scrollTo('#kategoriyalar');
await sleep(1800);
await shot('05-kategoriyalar');
await scrollTo('#tanlov');
await sleep(1800);
await shot('06-tanlov');
await scrollTo('#bolim', 'center');
await sleep(2300);
await shot('07-boshqa-bolim');
await run('window.scrollTo(0, document.documentElement.scrollHeight)');
await sleep(2300);
await shot('08-footer');

await open('/fit');
await sleep(2600);
await shot('09-fit');
await open('/katalog');
await sleep(2200);
await shot('10-katalog');
const firstProduct = await run(`document.querySelector('.card__link[href^="/tovar/"]')?.getAttribute('href') || ''`);
if (firstProduct) {
  await open(firstProduct);
  await sleep(2200);
  await shot('11-tovar');
}

// Telefon
await viewport(390, 844, true);
await open('/');
await sleep(2600);
await shot('12-telefon-bosh-sahifa');
await run(`document.querySelector('[data-menu-toggle]')?.click()`);
await sleep(1300);
await shot('13-telefon-menyu');
await open('/katalog');
await sleep(2200);
await shot('14-telefon-katalog');
if (firstProduct) {
  await open(firstProduct);
  await sleep(2200);
  await shot('15-telefon-tovar');
}

console.log(`\n  Slayder ${slide > 0 ? 'o‘zi almashdi (2-slayd ochildi)' : 'almashmadi — tekshirib ko‘ring'}.\n`);
socket.close();
await stop(0);
