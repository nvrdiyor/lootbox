// Serverga qo'yilgandagi rejim tekshiruvi (nginx ortida: TRUST_PROXY=true, SITE_URL=https://...).
// `npm run check` ichida ikkinchi bo'lib ishlaydi. Vaqtinchalik bazada, haqiqiy data/ ga tegmaydi.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-proxy-'));
const password = `proxy-${crypto.randomBytes(9).toString('hex')}`;
process.env.DATA_DIR = tmp;
process.env.ADMIN_PASSWORD = password;
process.env.SITE_URL = 'https://lootbox.test/';
process.env.TRUST_PROXY = 'true';

const { closeDb } = await import('../server/db/index.js');
const { seedIfEmpty } = await import('../server/db/seed.js');
const repo = await import('../server/db/repo.js');
const auth = await import('../server/lib/auth.js');
const { createApp } = await import('../server/app.js');

let passed = 0;
const failures = [];
const ok = (condition, label, detail = '') => {
  if (condition) passed += 1;
  else failures.push(detail ? `${label} — ${detail}` : label);
};
const eq = (actual, expected, label) =>
  ok(actual === expected, label, `kutilgan: ${JSON.stringify(expected)}, chiqdi: ${JSON.stringify(actual)}`);

seedIfEmpty();
auth.endSessionsIfPasswordChanged();
const app = createApp();
// nginx "Host $host" uzatadi — so'rov manzilidagi nom shu vazifani bajaradi
const request = (host, url, init = {}) => app.fetch(new Request(`http://${host}${url}`, init));
const SITE = 'lootbox.test';

// ---- Qaysi manzillar bilan ochiladi ---------------------------------------------
eq((await request(SITE, '/')).status, 200, 'manzil: o‘z domeni bilan ochiladi');
eq((await request(`www.${SITE}`, '/')).status, 200, 'manzil: www bilan ham ochiladi');
eq((await request('localhost:3210', '/')).status, 200, 'manzil: localhost (server ichidan) ochiladi');
eq((await request('evil.example', '/')).status, 400, 'manzil: begona domen nomi rad etiladi');
eq((await request('203.0.113.9', '/')).status, 400, 'manzil: SITE_URL bor paytda IP bilan ochilmaydi');
eq((await request(SITE, '/', { headers: { 'X-Forwarded-Host': 'evil.example' } })).status, 400, 'manzil: begona X-Forwarded-Host rad etiladi');
eq((await request('evil.example', '/admin/login')).status, 400, 'manzil: begona nom bilan admin ham ochilmaydi');

const home = await (await request('localhost:3210', '/')).text();
ok(home.includes('<link rel="canonical" href="https://lootbox.test/">'), 'havolalar: canonical har doim SITE_URL dan');
ok(!home.includes('http://localhost'), 'havolalar: sahifada ichki manzil chiqmaydi');
const sitemap = await (await request(SITE, '/sitemap.xml')).text();
ok(sitemap.includes('<loc>https://lootbox.test/</loc>') && !sitemap.includes('evil'), 'sitemap: manzillar SITE_URL dan');

// ---- IndexNow: haqiqiy saytda yoqiladi, yuboriladigan narsa — faqat sayt manzillari ------------
// Tekshiruv internetga chiqmaydi: yuborish o'rniga soxta "fetch" beriladi, navbat esa darhol o'chirib qo'yiladi.
const indexnow = await import('../server/lib/indexnow.js');
ok(indexnow.indexNowEnabled(), 'indexnow: https manzilli saytda yoqilgan');
repo.saveSettings({ indexnow: '0' });
ok(!indexnow.indexNowEnabled() && indexnow.queueUrls('/katalog') === false, 'indexnow: sozlamada o‘chirilsa hech narsa yuborilmaydi');
let sent = null;
const submitted = await indexnow.submitUrls(['/katalog', '/katalog', '/tovar/sinov', 'https://evil.example/'], {
  fetchImpl: async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return { status: 202 };
  },
});
ok(
  submitted.ok && submitted.count === 2 && sent.url === 'https://yandex.com/indexnow' && sent.body.host === SITE &&
    sent.body.urlList.join(' ') === 'https://lootbox.test/katalog https://lootbox.test/tovar/sinov' &&
    sent.body.keyLocation === `https://lootbox.test/${sent.body.key}.txt`,
  'indexnow: so‘rovda faqat o‘z saytimizning manzillari va kalit fayli manzili bor',
);
eq(await (await request(SITE, `/${sent.body.key}.txt`)).text(), sent.body.key, 'indexnow: kalit fayli sayt manzilida ochiladi');

// ---- Parol urinishlari: IP faqat proksi qo'ygan qiymatdan olinadi ------------------
const login = (pw, headers = {}) =>
  request(SITE, '/admin/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: `https://${SITE}`, ...headers },
    body: new URLSearchParams({ password: pw }).toString(),
  });

// Hujumchi har safar X-Forwarded-For boshiga yangi "IP" yozadi — baribir bitta IP deb sanaladi
let status = 0;
for (let i = 0; i < 9; i++) {
  status = (await login(`taxmin-${i}`, { 'X-Forwarded-For': `10.9.8.${i}, 198.51.100.7` })).status;
}
eq(status, 429, 'cheklov: X-Forwarded-For boshini almashtirib aylanib o‘tib bo‘lmaydi');
eq((await login(password, { 'X-Forwarded-For': '77.77.77.77, 198.51.100.7' })).status, 429, 'cheklov: bloklangan IP to‘g‘ri parol bilan ham kira olmaydi');

// Hujumchi egasining IP'sini boshiga yozib, uni bloklab qo'ya olmaydi
const OWNER = '203.0.113.50';
for (let i = 0; i < 9; i++) await login(`taxmin-${i}`, { 'X-Forwarded-For': `${OWNER}, 198.51.100.8` });
const owner = await login(password, { 'X-Real-IP': OWNER, 'X-Forwarded-For': OWNER });
eq(owner.status, 303, 'cheklov: egasining IP’sini soxtalashtirib uni bloklab bo‘lmaydi');

// X-Real-IP bo'lsa o'sha ishlatiladi; IP ko'rinishida bo'lmagan qiymat e'tiborga olinmaydi
for (let i = 0; i < 9; i++) status = (await login(`taxmin-${i}`, { 'X-Real-IP': '198.51.100.20', 'X-Forwarded-For': `1.1.1.${i}` })).status;
eq(status, 429, 'cheklov: X-Real-IP bo‘yicha sanaladi');
eq((await login('notogri', { 'X-Real-IP': 'x'.repeat(4000) })).status, 401, 'cheklov: IP bo‘lmagan uzun qiymat kalit sifatida saqlanmaydi');

// ---- Cookie va sessiyalar ---------------------------------------------------------
const setCookie = owner.headers.getSetCookie().find((c) => c.startsWith('lb_admin=')) || '';
ok(/;\s*Secure/i.test(setCookie), 'cookie: HTTPS saytda Secure belgisi bilan (proksi sarlavha bermasa ham)');
const cookie = setCookie.split(';')[0];
eq((await request(SITE, '/admin', { headers: { Cookie: cookie }, redirect: 'manual' })).status, 200, 'sessiya: kirgandan keyin admin ochiladi');

eq(auth.endSessionsIfPasswordChanged(), false, 'parol: o‘zgarmagan bo‘lsa sessiyalar joyida');
repo.setMeta('password_print', 'eski-parol-izi');
eq(auth.endSessionsIfPasswordChanged(), true, 'parol: o‘zgargan bo‘lsa sessiyalar yopiladi');
eq((await request(SITE, '/admin', { headers: { Cookie: cookie }, redirect: 'manual' })).status, 302, 'parol: eski cookie endi ishlamaydi');
ok(!JSON.stringify(repo.getSettings()).includes('password'), 'parol: izi sozlamalar ro‘yxatida ko‘rinmaydi');

// Statistika: proksi ortida ham faqat o'z saytimizdan
const track = (origin) =>
  request(SITE, '/api/track', { method: 'POST', body: JSON.stringify({ id: 1, kind: 'uzum' }), headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Real-IP': '198.51.100.99' } });
await track('https://evil.example');
await track(`https://${SITE}`);
eq(repo.statsSummary(1).totals.uzum, 1, 'statistika: boshqa saytdan kelgan hodisa sanalmaydi');

closeDb();
fs.rmSync(tmp, { recursive: true, force: true });

// ---- Namuna parol haqiqiy parol sifatida ishlamaydi (alohida jarayonda) ---------------
const probe = spawnSync(
  process.execPath,
  ['--disable-warning=ExperimentalWarning', '--input-type=module', '-e',
    "const a = await import('./server/lib/auth.js'); console.log(a.passwordConfigured(), a.verifyPassword(process.env.ADMIN_PASSWORD)); const d = await import('./server/db/index.js'); d.closeDb();"],
  {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, ADMIN_PASSWORD: 'bu-yerga-parol-yozing', DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lootbox-probe-')), SITE_URL: '', TRUST_PROXY: '' },
    encoding: 'utf8',
  },
);
eq((probe.stdout || '').trim(), 'false false', 'parol: namuna fayldagi yozuv parol sifatida qabul qilinmaydi');

if (failures.length) {
  console.error(`\n  Server rejimi: ${failures.length} ta tekshiruv o‘tmadi (${passed} tasi o‘tdi):\n`);
  for (const line of failures) console.error(`   ✗ ${line}`);
  console.error('');
  process.exit(1);
}
console.log(`  Server rejimi (nginx ortida): ${passed} ta tekshiruv o‘tdi.\n`);
