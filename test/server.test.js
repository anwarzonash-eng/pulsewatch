import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/config.js";
import { openDb, saveCheck } from "../src/db.js";
import { createApp } from "../src/server.js";

async function start(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

test("lists monitors with their last check", async () => {
  const config = normalize({ monitors: [{ name: "Home Page", url: "http://example.com" }] });
  const db = openDb(":memory:");
  saveCheck(db, "home-page", { ok: true, status: 200, ms: 40, error: null }, 1000);
  const srv = await start(createApp({ config, db }));

  const monitors = await (await fetch(`${srv.url}/api/monitors`)).json();
  assert.equal(monitors[0].id, "home-page");
  assert.equal(monitors[0].last.ms, 40);

  const checks = await (await fetch(`${srv.url}/api/monitors/home-page/checks`)).json();
  assert.equal(checks.length, 1);
  assert.equal((await fetch(`${srv.url}/api/monitors/nope/checks`)).status, 404);

  const badgeRes = await fetch(`${srv.url}/badge/home-page.svg?type=status`);
  assert.equal(badgeRes.headers.get("content-type"), "image/svg+xml; charset=utf-8");
  assert.match(await badgeRes.text(), /status: up/);
  assert.equal((await fetch(`${srv.url}/badge/nope.svg`)).status, 404);
  srv.close();
});
