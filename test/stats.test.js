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
