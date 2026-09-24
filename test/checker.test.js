import { test } from "node:test";
import assert from "node:assert/strict";
import { checkHttp } from "../src/checker.js";
import { monitor, testServer } from "./helpers.js";

test("2xx is up", async () => {
  const srv = await testServer((req, res) => res.end("hello"));
  const r = await checkHttp(monitor(srv.url));
  await srv.close();
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(r.error, null);
  assert.ok(r.ms >= 0);
});

test("5xx is down", async () => {
  const srv = await testServer((req, res) => {
    res.statusCode = 503;
    res.end();
  });
  const r = await checkHttp(monitor(srv.url));
  await srv.close();
  assert.equal(r.ok, false);
  assert.equal(r.error, "HTTP 503");
});

test("connection refused is down", async () => {
  const srv = await testServer((req, res) => res.end());
  const url = srv.url;
  await srv.close();
  const r = await checkHttp(monitor(url));
  assert.equal(r.ok, false);
  assert.equal(r.status, null);
  assert.match(r.error, /ECONNREFUSED/);
});

test("slow response times out", async () => {
  const srv = await testServer((req, res) => setTimeout(() => res.end(), 1500));
  const r = await checkHttp(monitor(srv.url, { timeout: 0.2 }));
  await srv.close();
  assert.equal(r.ok, false);
  assert.equal(r.error, "timeout after 0.2s");
});

test("keyword must be in the body", async () => {
  const srv = await testServer((req, res) => res.end("<h1>Welcome</h1>"));
  const found = await checkHttp(monitor(srv.url, { keyword: "Welcome" }));
  const missing = await checkHttp(monitor(srv.url, { keyword: "Dashboard" }));
  await srv.close();
  assert.equal(found.ok, true);
  assert.equal(missing.ok, false);
  assert.equal(missing.error, '"Dashboard" not found in response');
});

test("tcp: open port is up, closed port is down", async () => {
  const { checkTcp, runCheck } = await import("../src/checker.js");
  const srv = await testServer((req, res) => res.end());
  const port = Number(new URL(srv.url).port);
  const open = await runCheck({ type: "tcp", host: "127.0.0.1", port, timeout: 2 });
  await srv.close();
  const closed = await checkTcp({ host: "127.0.0.1", port, timeout: 2 });
  assert.equal(open.ok, true);
  assert.equal(open.error, null);
  assert.equal(closed.ok, false);
  assert.equal(closed.error, "ECONNREFUSED");
});

test("statusMatches", async () => {
  const { statusMatches } = await import("../src/checker.js");
  assert.equal(statusMatches(200), true);
  assert.equal(statusMatches(302), true);
  assert.equal(statusMatches(404), false);
  assert.equal(statusMatches(204, 204), true);
  assert.equal(statusMatches(200, 204), false);
  assert.equal(statusMatches(301, [200, 301]), true);
  assert.equal(statusMatches(250, "200-299"), true);
  assert.equal(statusMatches(300, "200-299"), false);
  assert.equal(statusMatches(401, ["401", "403"]), true);
});

test("expectStatus: a 401 can be the healthy answer", async () => {
  const srv = await testServer((req, res) => {
    res.statusCode = 401;
    res.end();
  });
  const r = await checkHttp(monitor(srv.url, { expectStatus: 401 }));
  await srv.close();
  assert.equal(r.ok, true);
});

test("sends monitor headers", async () => {
  let seen;
  const srv = await testServer((req, res) => {
    seen = req.headers;
    res.end();
  });
  await checkHttp(monitor(srv.url, { headers: { "x-health-key": "k1" } }));
  await srv.close();
  assert.equal(seen["x-health-key"], "k1");
  assert.equal(seen["user-agent"], "pulsewatch");
});
