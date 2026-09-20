import { test } from "node:test";
import assert from "node:assert/strict";
import { badge } from "../src/views/badge.js";

test("badge svg", () => {
  const svg = badge("uptime", "99.95%", "up");
  assert.match(svg, /^<svg xmlns/);
  assert.match(svg, /aria-label="uptime: 99.95%"/);
  assert.match(svg, /fill="#1f9d55"/);
  assert.match(badge("status", "down", "down"), /#d64545/);
  assert.match(badge("status", "?", "weird"), /#9aa1ad/);
});

test("badge text is escaped", () => {
  assert.match(badge("a&b", "<1>", "up"), /a&amp;b.*&lt;1&gt;/s);
});
