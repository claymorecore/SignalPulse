import dbmod from "../../db/sqlite.js";

const ensureSchema = async () => {
  await dbmod.exec(`
    CREATE TABLE IF NOT EXISTS telegram_signal_sync(
      signal_key TEXT PRIMARY KEY,
      telegram_message_id INTEGER NULL,
      last_sent_hash TEXT NULL,
      last_update_ts INTEGER NOT NULL,
      status TEXT NOT NULL,
      pending_text TEXT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_ts INTEGER NULL
    );
    CREATE INDEX IF NOT EXISTS telegram_signal_sync_next_retry
      ON telegram_signal_sync(next_retry_ts);
  `);
};

const normalizeRow = (row) => ({
  signalKey: row.signal_key,
  telegramMessageId: row.telegram_message_id == null ? null : Number(row.telegram_message_id),
  lastSentHash: row.last_sent_hash || null,
  lastUpdateTs: Number(row.last_update_ts || 0),
  status: String(row.status || ""),
  pendingText: row.pending_text || null,
  retryCount: Number(row.retry_count || 0),
  nextRetryTs: row.next_retry_ts == null ? null : Number(row.next_retry_ts)
});

export const createTelegramStore = () => ({
  async init() {
    await dbmod.initDb();
    await ensureSchema();
  },

  async get(signalKey) {
    await this.init();
    const row = await dbmod.get(
      `SELECT signal_key, telegram_message_id, last_sent_hash, last_update_ts, status, pending_text, retry_count, next_retry_ts
       FROM telegram_signal_sync
       WHERE signal_key=?`,
      [signalKey]
    );
    return row ? normalizeRow(row) : null;
  },

  async list() {
    await this.init();
    const rows = await dbmod.all(
      `SELECT signal_key, telegram_message_id, last_sent_hash, last_update_ts, status, pending_text, retry_count, next_retry_ts
       FROM telegram_signal_sync`
    );
    return rows.map(normalizeRow);
  },

  async upsert(record) {
    await this.init();
    await dbmod.run(
      `INSERT INTO telegram_signal_sync(
        signal_key, telegram_message_id, last_sent_hash, last_update_ts, status, pending_text, retry_count, next_retry_ts
      ) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(signal_key) DO UPDATE SET
        telegram_message_id=excluded.telegram_message_id,
        last_sent_hash=excluded.last_sent_hash,
        last_update_ts=excluded.last_update_ts,
        status=excluded.status,
        pending_text=excluded.pending_text,
        retry_count=excluded.retry_count,
        next_retry_ts=excluded.next_retry_ts`,
      [
        record.signalKey,
        record.telegramMessageId ?? null,
        record.lastSentHash ?? null,
        record.lastUpdateTs ?? Date.now(),
        record.status ?? "",
        record.pendingText ?? null,
        record.retryCount ?? 0,
        record.nextRetryTs ?? null
      ]
    );
    return record;
  },

  async remove(signalKey) {
    await this.init();
    await dbmod.run("DELETE FROM telegram_signal_sync WHERE signal_key=?", [signalKey]);
  }
});

export default {
  createTelegramStore
};