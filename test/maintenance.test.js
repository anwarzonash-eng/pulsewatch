import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb, recentChecks, saveCheck } from "../src/db.js";
import { activeWindow, currentAndUpcoming, parseWindows } from "../src/maintenance.js";
import { uptime } from "../src/stats.js";
import { renderStatus } from "../src/views/status.js";

const windows = parseWindows([
  { start: "2026-07-12T22:00:00Z", end: "2026-07-12T23:00:00Z", monitors: ["api"], note: "DB upgrade" },
  { start: "2026-07-20T01:00:00Z", end: "2026-07-20T02:00:00Z" },
]);
const at = (iso) => Date.parse(iso);

test("active window per monitor", () => {
  assert.equal(activeWindow(windows, "api", at("2026-07-12T22:30:00Z")).note, "DB upgrade");
  assert.equal(activeWindow(windows, "site", at("2026-07-12T22:30:00Z")), null);
  assert.equal(activeWindow(windows, "api", at("2026-07-12T23:00:00Z")), null, "end is exclusive");
  assert.ok(activeWindow(windows, "anything", at("2026-07-20T01:30:00Z")), "no monitors = all");
});

test("current and upcoming", () => {
  const list = currentAndUpcoming(windows, at("2026-07-12T22:30:00Z"));
  assert.equal(list.length, 1);
  assert.equal(currentAndUpcoming(windows, at("2026-07-14T00:00:00Z")).length, 1);
  assert.equal(currentAndUpcoming(windows, at("2026-08-01T00:00:00Z")).length, 0);
});

test("maintenance checks do not count against uptime", () => {
  const db = openDb(":memory:");
  saveCheck(db, "api", { ok: true, status: 200, ms: 1, error: null }, 1);
  saveCheck(db, "api", { ok: false, status: 503, ms: 1, error: "HTTP 503" }, 2, { maintenance: true });
  assert.equal(uptime(db, "api", 0), 100);
  assert.equal(recentChecks(db, "api")[0].maintenance, true);
});

test("old databases get the new column", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "pulsewatch-"));
  const file = join(dir, "old.db");
  const old = new Database(file);
  old.exec("CREATE TABLE checks (id INTEGER PRIMARY KEY, monitor_id TEXT NOT NULL, checked_at INTEGER NOT NULL, ok INTEGER NOT NULL, status INTEGER, ms INTEGER, error TEXT)");
  old.prepare("INSERT INTO checks (monitor_id, checked_at, ok) VALUES ('api', 1, 1)").run();
  old.close();

  const db = openDb(file);
  saveCheck(db, "api", { ok: true, status: 200, ms: 1, error: null }, 2, { maintenance: true });
  assert.deepEqual(recentChecks(db, "api").map((c) => Boolean(c.maintenance)), [true, false]);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("status page shows maintenance", () => {
  const html = renderStatus({
    title: "S",
    monitors: [{ id: "api", name: "API", last: { ok: false, ms: 1 }, maintenance: true }],
    maintenance: [windows[0]],
    now: at("2026-07-12T22:30:00Z"),
  });
  assert.match(html, /All systems operational/);
  assert.match(html, /class="monitor maintenance"/);
  assert.match(html, /DB upgrade/);
  assert.match(html, /now, until 2026-07-12 23:00 UTC/);
});
