import { serve } from '@hono/node-server';
import { config } from './config.js';
import { closeDb } from './db/index.js';
import { seedIfEmpty } from './db/seed.js';
import { catalogPhotoStatus } from './db/catalog.js';
import { deleteOrphanImages } from './db/repo.js';
import { passwordConfigured, endSessionsIfPasswordChanged } from './lib/auth.js';
import { createApp } from './app.js';

const seeded = seedIfEmpty();
// Katalog tovarlarida rasm qolmagan bo'lsa (masalan, uploads papkasi o'chirilgan) — eslatamiz
const catalogPhotos = catalogPhotoStatus();
// .env dagi parol almashtirilgan bo'lsa, eski parol bilan ochilgan sessiyalar yopiladi
const sessionsClosed = endSessionsIfPasswordChanged();

// Hech qaysi tovarga biriktirilmay qolgan (masalan, saqlanmagan formadagi) rasmlarni tozalash
const DAY = 86_400_000;
const sweep = () => {
  try {
    deleteOrphanImages({ olderThanMs: DAY });
  } catch (err) {
    console.error('[tozalash]', err);
  }
};
sweep();
setInterval(sweep, DAY / 4).unref();

const app = createApp();

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  const shownHost = config.host === '0.0.0.0' || config.host === '127.0.0.1' ? 'localhost' : config.host;
  console.log(`\n  LOOTBOX  →  http://${shownHost}:${info.port}`);
  console.log(`  FIT      →  http://${shownHost}:${info.port}/fit`);
  console.log(`  Admin    →  http://${shownHost}:${info.port}/admin`);
  if (seeded) console.log('\n  Boshlang\'ich katalog yozildi: LOOTBOX — haqiqiy tovarlar, FIT — namuna (admin paneldan o\'chirish mumkin).');
  if (catalogPhotos.withoutPhotos) console.log(`\n  ${catalogPhotos.withoutPhotos} ta tovarda rasm yo'q. Tayyor rasmlarni biriktirish:  npm run catalog`);
  if (config.envCreated) console.log('\n  Admin paroli yaratildi: .env faylidagi ADMIN_PASSWORD qatoriga qarang.');
  if (!passwordConfigured()) console.log('\n  DIQQAT: ADMIN_PASSWORD o\'rnatilmagan, 8 belgidan qisqa yoki namuna parol — admin panelga kirib bo\'lmaydi (.env).');
  if (sessionsClosed) console.log('\n  Admin paroli o\'zgargan: barcha ochiq sessiyalar yopildi, qayta kirish kerak.');
  if (config.trustProxy && !config.siteUrl) console.log('\n  DIQQAT: TRUST_PROXY yoqilgan, lekin SITE_URL kiritilmagan — sayt domen nomi bilan ochilmaydi (.env).');
  console.log(config.dev ? '  Rejim: dev (fayl o\'zgarsa o\'zi yangilanadi)\n' : '  Rejim: production\n');
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n  ${config.port}-port band. .env faylida PORT ni o'zgartiring yoki eski serverni to'xtating.\n`);
    process.exit(1);
  }
  throw err;
});

function shutdown() {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
