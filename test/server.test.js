import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/config.js";
import { openDb, saveCheck } from "../src/db.js";
import { IncidentTracker } from "../src/incidents.js";
import { createApp } from "../src/server.js";

const up = { ok: true, status: 200, ms: 40, error: null };
const down = { ok: false, status: 500, ms: 90, error: "HTTP 500" };

let srv;
const get = (path) => fetch(`${srv.url}${path}`);

before(async () => {
  const config = normalize({
    title: "Test Status",
    monitors: [
      { name: "Home Page", url: "http://example.com" },
      { name: "API", url: "http://example.com/api" },
    ],
  });
  const db = openDb(":memory:");
  const now = Date.now();
  for (let i = 0; i < 60; i++) saveCheck(db, "home-page", up, now - i * 1000);
  saveCheck(db, "api", down, now - 2000);
  saveCheck(db, "api", down, now - 1000);
  const tracker = new IncidentTracker(db, { threshold: 2 });
  tracker.record({ id: "api" }, down, now - 2000);
  tracker.record({ id: "api" }, down, now - 1000);

  const server = createApp({ config, db }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  srv = { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
});

after(() => srv.close());

test("GET /api/monitors", async () => {
  const monitors = await (await get("/api/monitors")).json();
  assert.deepEqual(monitors.map((m) => m.id), ["home-page", "api"]);
  assert.equal(monitors[0].last.ms, 40);
  assert.equal(monitors[0].uptime.day, 100);
  assert.equal(monitors[1].uptime.day, 0);
});

test("GET /api/monitors/:id/checks with limit", async () => {
  assert.equal((await (await get("/api/monitors/home-page/checks")).json()).length, 50);
  assert.equal((await (await get("/api/monitors/home-page/checks?limit=5")).json()).length, 5);
  assert.equal((await (await get("/api/monitors/home-page/checks?limit=abc")).json()).length, 50);
  assert.equal((await get("/api/monitors/nope/checks")).status, 404);
});

test("GET /api/incidents", async () => {
  const incidents = await (await get("/api/incidents")).json();
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].monitorId, "api");
  assert.equal(incidents[0].resolvedAt, null);
});

test("status page", async () => {
  const res = await get("/");
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /Test Status/);
  assert.match(html, /Some systems are down/);
  assert.match(html, /Ongoing/);
});

test("badges", async () => {
  const res = await get("/badge/home-page.svg?type=status");
  assert.equal(res.headers.get("content-type"), "image/svg+xml; charset=utf-8");
  assert.match(await res.text(), /status: up/);
  assert.match(await (await get("/badge/api.svg")).text(), /uptime: 0.00%/);
  assert.equal((await get("/badge/nope.svg")).status, 404);
});

test("static files", async () => {
  assert.equal((await get("/style.css")).status, 200);
});
