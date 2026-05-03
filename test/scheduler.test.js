import { test } from "node:test";
import assert from "node:assert/strict";
import { startScheduler } from "../src/scheduler.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("checks right away and then on the interval", async () => {
  const seen = [];
  const stop = startScheduler([{ id: "a", interval: 0.05 }], (m, r) => seen.push(r), {
    check: async () => ({ ok: true }),
  });
  await wait(130);
  stop();
  assert.ok(seen.length >= 3, `got ${seen.length}`);
});

test("does not start a check while the previous one is running", async () => {
  let active = 0;
  let maxActive = 0;
  const stop = startScheduler([{ id: "a", interval: 0.02 }], () => {}, {
    check: async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await wait(70);
      active--;
      return { ok: true };
    },
  });
  await wait(150);
  stop();
  assert.equal(maxActive, 1);
});
