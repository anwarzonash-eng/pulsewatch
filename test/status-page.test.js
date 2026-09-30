import { test } from "node:test";
import assert from "node:assert/strict";
import { renderStatus } from "../src/views/status.js";

test("all up", () => {
  const html = renderStatus({
    title: "Acme Status",
    monitors: [{ name: "Site", last: { ok: true, ms: 80 } }],
    now: Date.UTC(2026, 3, 5, 12, 0),
  });
  assert.match(html, /<title>Acme Status<\/title>/);
  assert.match(html, /All systems operational/);
  assert.match(html, /class="monitor up"/);
  assert.match(html, /Updated <time datetime="2026-04-05T12:00:00.000Z">2026-04-05 12:00 UTC<\/time>/);
});

test("one down, one without data", () => {
  const html = renderStatus({
    title: "Status",
    monitors: [{ name: "API", last: { ok: false, ms: 10 } }, { name: "New", last: null }],
  });
  assert.match(html, /Some systems are down/);
  assert.match(html, /class="monitor down"/);
  assert.match(html, /class="monitor unknown"/);
});

test("incidents section", async () => {
  const { formatDuration } = await import("../src/views/status.js");
  const html = renderStatus({
    title: "Status",
    monitors: [{ id: "api", name: "API", last: { ok: true, ms: 10 } }],
    incidents: [
      { id: 2, monitorId: "api", startedAt: 0, resolvedAt: null, cause: "HTTP 502" },
      { id: 1, monitorId: "api", startedAt: 0, resolvedAt: 90 * 60000, cause: "timeout after 10s" },
    ],
    now: 30 * 60000,
  });
  assert.match(html, /Ongoing/);
  assert.match(html, /Resolved/);
  assert.match(html, /1 h 30 min/);
  assert.match(html, /HTTP 502/);
  assert.equal(formatDuration(5 * 1000), "1 min");
  assert.equal(formatDuration(2 * 3600000), "2 h");
});

test("no monitors", () => {
  const html = renderStatus({ title: "S", monitors: [] });
  assert.match(html, /No monitors configured yet/);
  assert.doesNotMatch(html, /All systems operational/);
});

test("no incidents", () => {
  assert.match(renderStatus({ title: "S", monitors: [] }), /No incidents in the last 14 days/);
});

test("history bars", async () => {
  const { historyClass } = await import("../src/views/status.js");
  assert.equal(historyClass(null), "none");
  assert.equal(historyClass(100), "good");
  assert.equal(historyClass(99), "warn");
  assert.equal(historyClass(80), "bad");
  const html = renderStatus({
    title: "S",
    monitors: [{ id: "a", name: "A", last: { ok: true, ms: 1 }, history: [{ date: "2026-07-10", uptime: 50 }] }],
  });
  assert.match(html, /<span class="bar bad" title="2026-07-10: 50.00%">/);
});

test("escapes names, notes and causes", async () => {
  const { escapeHtml } = await import("../src/views/status.js");
  assert.equal(escapeHtml(`<b>"Tom & Jerry's"</b>`), "&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;");
  const html = renderStatus({
    title: "<script>x</script>",
    monitors: [{ id: "a", name: "<img src=x onerror=alert(1)>", last: { ok: true, ms: 1 } }],
    incidents: [{ id: 1, monitorId: "a", startedAt: 0, resolvedAt: null, cause: '"<x>" not found in response' }],
    now: 1,
  });
  assert.doesNotMatch(html, /<script>x<\/script>|<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&quot;&lt;x&gt;&quot; not found/);
});
