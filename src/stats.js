export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** Percentage of successful checks since `since` (ms), or null without data. Maintenance is not counted. */
export function uptime(db, monitorId, since) {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS total, SUM(ok) AS up FROM checks WHERE monitor_id = ? AND checked_at >= ? AND maintenance = 0",
    )
    .get(monitorId, since);
  return row.total ? (row.up / row.total) * 100 : null;
}

/** Average response time in ms of successful checks since `since`, or null. */
export function avgResponse(db, monitorId, since) {
  const row = db
    .prepare("SELECT AVG(ms) AS avg FROM checks WHERE monitor_id = ? AND checked_at >= ? AND ok = 1")
    .get(monitorId, since);
  return row.avg == null ? null : Math.round(row.avg);
}

export function uptimeSummary(db, monitorId, now = Date.now()) {
  return {
    day: uptime(db, monitorId, now - DAY),
    week: uptime(db, monitorId, now - 7 * DAY),
    month: uptime(db, monitorId, now - 30 * DAY),
    avgMs: avgResponse(db, monitorId, now - DAY),
  };
}

/** 99.98% style, never rounding up to 100 unless it is 100. */
export function formatPercent(value) {
  if (value == null) return "–";
  if (value === 100) return "100%";
  return `${(Math.floor(value * 100) / 100).toFixed(2)}%`;
}
