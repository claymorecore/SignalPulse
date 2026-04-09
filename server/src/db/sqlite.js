import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import env from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sqlite3.verbose();

let _db = null;
let _ready = null;

const defaultPath = path.resolve(__dirname, "../../data.sqlite");

const openDb = (filename) =>
  new Promise((res, rej) => {
    const db = new sqlite3.Database(filename, (e) => (e ? rej(e) : res(db)));
  });

const execP = (db, sql) =>
  new Promise((res, rej) => db.exec(sql, (e) => (e ? rej(e) : res())));

const runP = (db, sql, params) =>
  new Promise((res, rej) =>
    db.run(sql, params || [], function (e) {
      if (e) rej(e);
      else
        res({
          changes: this.changes,
          lastID: this.lastID
        });
    })
  );

const getP = (db, sql, params) =>
  new Promise((res, rej) =>
    db.get(sql, params || [], (e, row) => (e ? rej(e) : res(row)))
  );

const allP = (db, sql, params) =>
  new Promise((res, rej) =>
    db.all(sql, params || [], (e, rows) => (e ? rej(e) : res(rows)))
  );

const closeP = (db) =>
  new Promise((res, rej) => db.close((e) => (e ? rej(e) : res())));

const pragmas = async (db) => {
  await execP(db, "PRAGMA journal_mode=WAL;");
  await execP(db, "PRAGMA synchronous=NORMAL;");
  await execP(db, "PRAGMA foreign_keys=ON;");
  await execP(db, "PRAGMA temp_store=MEMORY;");
  await execP(db, "PRAGMA busy_timeout=6000;");
};

const schema = async (db) => {
  await execP(
    db,
    `
CREATE TABLE IF NOT EXISTS kv(
key TEXT PRIMARY KEY,
value TEXT NOT NULL,
updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS logs(
id INTEGER PRIMARY KEY AUTOINCREMENT,
ts INTEGER NOT NULL,
lvl TEXT NOT NULL,
msg TEXT NOT NULL,
ctx TEXT NULL
);
CREATE INDEX IF NOT EXISTS logs_ts ON logs(ts);

CREATE TABLE IF NOT EXISTS signals(
key TEXT PRIMARY KEY,
symbol TEXT NOT NULL,
tf TEXT NOT NULL,
setup TEXT NOT NULL,
side TEXT NOT NULL,
status TEXT NOT NULL,
entry REAL NOT NULL,
sl REAL NOT NULL,
tp REAL NOT NULL,
rr REAL NOT NULL,
close_time INTEGER NOT NULL,
created_at INTEGER NOT NULL,
last_scan_ts INTEGER NOT NULL,
last_live_ts INTEGER NULL,
live REAL NULL,
pnl_pct REAL NULL,
pnl_usdt REAL NULL,
history_json TEXT NULL
);
CREATE INDEX IF NOT EXISTS signals_symbol_tf ON signals(symbol,tf);
CREATE INDEX IF NOT EXISTS signals_status ON signals(status);

CREATE TABLE IF NOT EXISTS prices(
symbol TEXT PRIMARY KEY,
mode TEXT NOT NULL,
price REAL NOT NULL,
ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS prices_ts ON prices(ts);
`
  );
};

export async function initDb(opts = {}) {
  if (_ready) return _ready;

  _ready = (async () => {
    const filename = opts.filename || env.DB_PATH || defaultPath;
    if (filename !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    }
    const db = await openDb(filename);
    await pragmas(db);
    await schema(db);
    _db = db;
    return _db;
  })();

  return _ready;
}

export function db() {
  if (!_db) throw new Error("DB not initialized. Call initDb() first.");
  return _db;
}

export function isOpen() {
  return !!_db;
}

export async function exec(sql) {
  await initDb();
  return execP(_db, sql);
}

export async function run(sql, params) {
  await initDb();
  return runP(_db, sql, params);
}

export async function get(sql, params) {
  await initDb();
  return getP(_db, sql, params);
}

export async function all(sql, params) {
  await initDb();
  return allP(_db, sql, params);
}

export async function closeDb() {
  if (!_db) return;

  const d = _db;
  _db = null;
  _ready = null;

  await closeP(d);
}

export default {
  initDb,
  db,
  isOpen,
  exec,
  run,
  get,
  all,
  closeDb
};
