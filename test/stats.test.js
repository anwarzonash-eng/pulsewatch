import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb, saveCheck } from "../src/db.js";
import { DAY, avgResponse, formatPercent, uptime, uptimeSummary } from "../src/stats.js";

const up = (ms) => ({ ok: true, status: 200, ms, error: null });
const down = { ok: false, status: 500, ms: 900, error: "HTTP 500" };

test("uptime and average response", () => {
  const db = openDb(":memory:");
  const now = 10 * DAY;
  saveCheck(db, "a", up(100), now - 1000);
  saveCheck(db, "a", up(300), now - 2000);
  saveCheck(db, "a", down, now - 3000);
  saveCheck(db, "a", down, now - 3 * DAY); // outside the last day

  assert.equal(Math.round(uptime(db, "a", now - DAY)), 67);
  assert.equal(uptime(db, "a", now - 7 * DAY), 50);
  assert.equal(avgResponse(db, "a", now - DAY), 200);
  assert.equal(uptime(db, "none", 0), null);

  const s = uptimeSummary(db, "a", now);
  assert.equal(s.week, 50);
  assert.equal(s.avgMs, 200);
});

test("formatPercent", () => {
  assert.equal(formatPercent(100), "100%");
  assert.equal(formatPercent(99.999), "99.99%");
  assert.equal(formatPercent(50), "50.00%");
  assert.equal(formatPercent(null), "–");
});

test("dailyHistory", async () => {
  const { dailyHistory } = await import("../src/stats.js");
  const db = openDb(":memory:");
  const now = Date.UTC(2026, 6, 10, 12);
  saveCheck(db, "a", up(1), Date.UTC(2026, 6, 10, 1));
  saveCheck(db, "a", down, Date.UTC(2026, 6, 10, 2));
  saveCheck(db, "a", up(1), Date.UTC(2026, 6, 8, 5));
  saveCheck(db, "a", down, Date.UTC(2026, 5, 1)); // too old
  const days = dailyHistory(db, "a", 3, now);
  assert.deepEqual(days, [
    { date: "2026-07-08", uptime: 100 },
    { date: "2026-07-09", uptime: null },
    { date: "2026-07-10", uptime: 50 },
  ]);
});
