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
