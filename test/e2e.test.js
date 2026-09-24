// Starts the real process against a fake site and reads the API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { testServer } from "./helpers.js";

const entry = fileURLToPath(new URL("../src/index.js", import.meta.url));

async function freePort() {
  const srv = createServer().listen(0);
  await new Promise((resolve) => srv.once("listening", resolve));
  const { port } = srv.address();
  await new Promise((resolve) => srv.close(resolve));
  return port;
}

async function waitFor(fn, timeout = 10_000) {
  const until = Date.now() + timeout;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    if (Date.now() > until) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

test("watches a site end to end", async () => {
  const site = await testServer((req, res) => {
    res.statusCode = req.url === "/broken" ? 500 : 200;
    res.end("ok");
  });
  const dir = mkdtempSync(join(tmpdir(), "pulsewatch-e2e-"));
  const port = await freePort();
  writeFileSync(
    join(dir, "pulsewatch.json"),
    JSON.stringify({
      port,
      database: join(dir, "e2e.db"),
      failuresBeforeIncident: 1,
      monitors: [
        { name: "Good", url: `${site.url}/`, interval: 5, timeout: 2 },
        { name: "Broken", url: `${site.url}/broken`, interval: 5, timeout: 2 },
      ],
    }),
  );
  const child = spawn(process.execPath, [entry, join(dir, "pulsewatch.json")], { stdio: "pipe" });

  try {
    const status = await waitFor(async () => {
      const s = await (await fetch(`http://127.0.0.1:${port}/api/status`)).json();
      return s.monitors.every((m) => m.state !== "unknown") && s;
    });
    assert.deepEqual(status.monitors.map((m) => m.state), ["up", "down"]);
    assert.equal(status.state, "down");
    assert.equal(status.openIncidents, 1);
    assert.match(await (await fetch(`http://127.0.0.1:${port}/`)).text(), /Some systems are down/);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await site.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
