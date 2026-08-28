import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { IncidentTracker, listIncidents } from "../src/incidents.js";

const m = { id: "api" };
const ok = { ok: true };
const fail = (error = "HTTP 500") => ({ ok: false, error });

test("one failed check is not an incident", () => {
  const t = new IncidentTracker(openDb(":memory:"));
  assert.equal(t.record(m, fail(), 1), null);
  assert.equal(t.record(m, ok, 2), null);
});

test("opens after the threshold and resolves on success", () => {
  const db = openDb(":memory:");
  const t = new IncidentTracker(db, { threshold: 2 });
  t.record(m, fail(), 1);
  const opened = t.record(m, fail("timeout after 10s"), 2);
  assert.equal(opened.type, "opened");
  assert.equal(opened.incident.cause, "timeout after 10s");
  assert.equal(t.record(m, fail(), 3), null, "no second incident while one is open");

  const resolved = t.record(m, ok, 4);
  assert.equal(resolved.type, "resolved");
  assert.equal(resolved.incident.resolvedAt, 4);

  const [stored] = listIncidents(db);
  assert.deepEqual(stored, { id: 1, monitorId: "api", startedAt: 2, resolvedAt: 4, cause: "timeout after 10s" });
});

test("failures are counted per monitor", () => {
  const t = new IncidentTracker(openDb(":memory:"), { threshold: 2 });
  t.record({ id: "a" }, fail(), 1);
  assert.equal(t.record({ id: "b" }, fail(), 2), null);
  assert.equal(t.record({ id: "a" }, fail(), 3).type, "opened");
});

test("a success in between resets the count", () => {
  const t = new IncidentTracker(openDb(":memory:"), { threshold: 3 });
  t.record(m, fail(), 1);
  t.record(m, fail(), 2);
  t.record(m, ok, 3);
  t.record(m, fail(), 4);
  assert.equal(t.record(m, fail(), 5), null);
  assert.equal(t.record(m, fail(), 6).type, "opened");
});

test("listIncidents filters by monitor, newest first", () => {
  const db = openDb(":memory:");
  const t = new IncidentTracker(db, { threshold: 1 });
  t.record({ id: "a" }, fail(), 1);
  t.record({ id: "b" }, fail(), 2);
  t.record({ id: "a" }, ok, 3);
  t.record({ id: "a" }, fail(), 4);
  assert.deepEqual(listIncidents(db).map((i) => i.startedAt), [4, 2, 1]);
  assert.deepEqual(listIncidents(db, { monitorId: "a" }).map((i) => i.startedAt), [4, 1]);
});

test("open incidents survive a restart", () => {
  const db = openDb(":memory:");
  const first = new IncidentTracker(db, { threshold: 2 });
  first.record(m, fail(), 1);
  first.record(m, fail(), 2);

  const second = new IncidentTracker(db, { threshold: 2 });
  assert.equal(second.record(m, fail(), 3), null, "no duplicate incident");
  const resolved = second.record(m, ok, 4);
  assert.equal(resolved.type, "resolved");
  assert.equal(resolved.incident.startedAt, 2);
  assert.equal(listIncidents(db).length, 1);
  assert.equal(listIncidents(db)[0].resolvedAt, 4);
});
