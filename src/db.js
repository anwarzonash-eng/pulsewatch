import Database from "better-sqlite3";

export function openDb(file) {
  const db = new Database(file);
  // WAL lets the status page read while a check is being written;
  // without it we saw SQLITE_BUSY under load
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      ok INTEGER NOT NULL,
      status INTEGER,
      ms INTEGER,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      resolved_at INTEGER,
      cause TEXT
    );
  `);
  return db;
}

export function saveCheck(db, monitorId, result, at = Date.now()) {
  db.prepare(
    "INSERT INTO checks (monitor_id, checked_at, ok, status, ms, error) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(monitorId, at, result.ok ? 1 : 0, result.status, result.ms, result.error);
}

export function recentChecks(db, monitorId, limit = 50) {
  return db
    .prepare("SELECT * FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?")
    .all(monitorId, limit)
    .map(toCheck);
}

export function lastCheck(db, monitorId) {
  return recentChecks(db, monitorId, 1)[0] ?? null;
}

function toCheck(row) {
  return { at: row.checked_at, ok: row.ok === 1, status: row.status, ms: row.ms, error: row.error };
}

/** Delete checks older than `before` (ms). Incidents are kept. */
export function pruneChecks(db, before) {
  return db.prepare("DELETE FROM checks WHERE checked_at < ?").run(before).changes;
}
