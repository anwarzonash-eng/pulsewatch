import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

test("example config loads", () => {
  const config = loadConfig(fileURLToPath(new URL("../pulsewatch.example.json", import.meta.url)));
  assert.equal(config.monitors.length, 4);
  assert.deepEqual(config.monitors.map((m) => m.id), ["example-site", "example-docs", "local-api", "local-postgres"]);
});
