/**
 * Turns a stream of check results into incidents.
 *
 * An incident opens after `threshold` failed checks in a row (one blip is not
 * an outage) and resolves on the next successful check.
 */
export class IncidentTracker {
  constructor(db, { threshold = 2 } = {}) {
    this.db = db;
    this.threshold = threshold;
    this.failures = new Map(); // monitor id -> failed checks in a row
    this.open = new Map(); // monitor id -> open incident
  }

  /** @returns {{type: "opened" | "resolved", incident: object} | null} */
  record(monitor, result, at = Date.now()) {
    if (result.ok) {
      this.failures.set(monitor.id, 0);
      const incident = this.open.get(monitor.id);
      if (!incident) return null;
      this.db.prepare("UPDATE incidents SET resolved_at = ? WHERE id = ?").run(at, incident.id);
      this.open.delete(monitor.id);
      return { type: "resolved", incident: { ...incident, resolvedAt: at } };
    }

    const failures = (this.failures.get(monitor.id) ?? 0) + 1;
    this.failures.set(monitor.id, failures);
    if (failures < this.threshold || this.open.has(monitor.id)) return null;

    const { lastInsertRowid } = this.db
      .prepare("INSERT INTO incidents (monitor_id, started_at, cause) VALUES (?, ?, ?)")
      .run(monitor.id, at, result.error);
    const incident = { id: Number(lastInsertRowid), monitorId: monitor.id, startedAt: at, resolvedAt: null, cause: result.error };
    this.open.set(monitor.id, incident);
    return { type: "opened", incident };
  }
}

export function listIncidents(db, { limit = 20, monitorId } = {}) {
  const rows = monitorId
    ? db.prepare("SELECT * FROM incidents WHERE monitor_id = ? ORDER BY started_at DESC LIMIT ?").all(monitorId, limit)
    : db.prepare("SELECT * FROM incidents ORDER BY started_at DESC LIMIT ?").all(limit);
  return rows.map((r) => ({
    id: r.id,
    monitorId: r.monitor_id,
    startedAt: r.started_at,
    resolvedAt: r.resolved_at,
    cause: r.cause,
  }));
}
