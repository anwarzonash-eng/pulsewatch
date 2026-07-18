/**
 * Planned maintenance windows from the config:
 *   { "start": "2026-07-12T22:00:00Z", "end": "2026-07-12T23:00:00Z", "monitors": ["api"], "note": "DB upgrade" }
 * Without "monitors" a window covers every monitor.
 */
export function parseWindows(list = []) {
  return list.map((w) => ({
    start: Date.parse(w.start),
    end: Date.parse(w.end),
    monitors: w.monitors ?? null,
    note: w.note ?? "",
  }));
}

export function activeWindow(windows, monitorId, now = Date.now()) {
  return (
    windows.find((w) => w.start <= now && now < w.end && (w.monitors == null || w.monitors.includes(monitorId))) ??
    null
  );
}

/** Windows that are running now or start within `ahead` ms. */
export function currentAndUpcoming(windows, now = Date.now(), ahead = 7 * 24 * 60 * 60 * 1000) {
  return windows.filter((w) => w.end > now && w.start < now + ahead).sort((a, b) => a.start - b.start);
}
