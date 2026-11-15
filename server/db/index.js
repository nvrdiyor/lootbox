// SQLite ulanishi (Node'ning o'zidagi node:sqlite — alohida o'rnatish kerak emas).
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { MIGRATIONS } from './schema.js';

export const db = new DatabaseSync(config.dbFile);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 4000;
`);

const statements = new Map();
function prepared(sql) {
  let stmt = statements.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statements.set(sql, stmt);
  }
  return stmt;
}

/** node:sqlite true/false/undefined qabul qilmaydi — songa/null'ga o'giramiz. */
function bind(params) {
  return params.map((value) => {
    if (value === true) return 1;
    if (value === false) return 0;
    if (value === undefined) return null;
    return value;
  });
}

export const all = (sql, ...params) => prepared(sql).all(...bind(params));
export const get = (sql, ...params) => prepared(sql).get(...bind(params));
export const run = (sql, ...params) => prepared(sql).run(...bind(params));

/** O'zgaruvchan sondagi "?" lar uchun (IN (...)) — keshlanmaydi. */
export const allDynamic = (sql, params) => db.prepare(sql).all(...bind(params));
export const runDynamic = (sql, params) => db.prepare(sql).run(...bind(params));

export const placeholders = (list) => list.map(() => '?').join(',');

let depth = 0;
/** Tranzaksiya: ichidagi hammasi yo to'liq yoziladi, yo umuman yozilmaydi. */
export function tx(fn) {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth += 1;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    depth -= 1;
  }
}

export const now = () => Date.now();

function migrate() {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let version = current; version < MIGRATIONS.length; version++) {
    tx(() => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

migrate();

export function closeDb() {
  try {
    statements.clear();
    db.close();
  } catch {
    // allaqachon yopilgan
  }
}
