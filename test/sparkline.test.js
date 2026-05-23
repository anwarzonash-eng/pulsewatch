import { test } from "node:test";
import assert from "node:assert/strict";
import { sparkline } from "../src/views/sparkline.js";

test("needs at least two points", () => {
  assert.equal(sparkline([]), "");
  assert.equal(sparkline([{ ok: true, ms: 5 }]), "");
});

test("draws a line and marks failures", () => {
  const checks = [
    { ok: true, ms: 100 },
    { ok: false, ms: 0 },
    { ok: true, ms: 50 },
  ]; // newest first, as they come from the db
  const svg = sparkline(checks, { width: 100, height: 20 });
  assert.match(svg, /^<svg class="spark"/);
  assert.match(svg, /points="0\.0,10\.0 50\.0,18\.0 100\.0,2\.0"/);
  assert.equal((svg.match(/<circle/g) ?? []).length, 1);
});
