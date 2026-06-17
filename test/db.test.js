import { test } from "node:test";
import assert from "node:assert/strict";
import { lastCheck, openDb, recentChecks, saveCheck } from "../src/db.js";

test("saves and reads checks newest first", () => {
  const db = openDb(":memory:");
  saveCheck(db, "a", { ok: true, status: 200, ms: 12, error: null }, 1000);
  saveCheck(db, "a", { ok: false, status: 500, ms: 30, error: "HTTP 500" }, 2000);
  saveCheck(db, "b", { ok: true, status: 200, ms: 5, error: null }, 1500);

  const checks = recentChecks(db, "a");
  assert.equal(checks.length, 2);
  assert.deepEqual(checks[0], { at: 2000, ok: false, status: 500, ms: 30, error: "HTTP 500" });
  assert.equal(lastCheck(db, "b").ms, 5);
  assert.equal(lastCheck(db, "missing"), null);
});

test("pruneChecks drops old rows only", async () => {
  const { pruneChecks } = await import("../src/db.js");
  const db = openDb(":memory:");
  for (const at of [100, 200, 300]) saveCheck(db, "a", { ok: true, status: 200, ms: 1, error: null }, at);
  assert.equal(pruneChecks(db, 250), 2);
  assert.deepEqual(recentChecks(db, "a").map((c) => c.at), [300]);
});
