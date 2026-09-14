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
      error TEXT,
      maintenance INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      resolved_at INTEGER,
      cause TEXT
    );
  `);
  migrate(db);
  // every query filters by monitor and time; without this the status page got
  // slow after a few months of 30 second checks
  db.exec(`
    CREATE INDEX IF NOT EXISTS checks_monitor_time ON checks (monitor_id, checked_at);
    CREATE INDEX IF NOT EXISTS incidents_started ON incidents (started_at);
  `);
  return db;
}

/** Databases created by older versions miss some columns. */
function migrate(db) {
  const columns = db.prepare("PRAGMA table_info(checks)").all().map((c) => c.name);
  if (!columns.includes("maintenance")) {
    db.exec("ALTER TABLE checks ADD COLUMN maintenance INTEGER NOT NULL DEFAULT 0");
  }
}

export function saveCheck(db, monitorId, result, at = Date.now(), { maintenance = false } = {}) {
  db.prepare(
    "INSERT INTO checks (monitor_id, checked_at, ok, status, ms, error, maintenance) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(monitorId, at, result.ok ? 1 : 0, result.status, result.ms, result.error, maintenance ? 1 : 0);
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
  const check = { at: row.checked_at, ok: row.ok === 1, status: row.status, ms: row.ms, error: row.error };
  if (row.maintenance) check.maintenance = true;
  return check;
}

/** Delete checks older than `before` (ms). Incidents are kept. */
export function pruneChecks(db, before) {
  return db.prepare("DELETE FROM checks WHERE checked_at < ?").run(before).changes;
}
