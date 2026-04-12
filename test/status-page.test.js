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
  assert.match(html, /Updated 2026-04-05 12:00 UTC/);
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
