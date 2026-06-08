import { test } from "node:test";
import assert from "node:assert/strict";
import { guessFormat, message, notify, payload } from "../src/notify.js";
import { testServer } from "./helpers.js";

const monitor = { id: "api", name: "API", url: "https://api.example.com" };
const opened = { type: "opened", incident: { id: 1, startedAt: 0, resolvedAt: null, cause: "HTTP 502" } };
const resolved = { type: "resolved", incident: { id: 1, startedAt: 0, resolvedAt: 5 * 60000, cause: "HTTP 502" } };

test("messages", () => {
  assert.equal(message(opened, monitor), "🔴 API is down: HTTP 502");
  assert.equal(message(resolved, monitor), "🟢 API is back up after 5 min");
  assert.equal(payload(opened, monitor).event, "incident.opened");
});

test("posts json to each webhook", async () => {
  const bodies = [];
  const srv = await testServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      bodies.push(JSON.parse(body));
      res.end();
    });
  });
  await notify([{ url: `${srv.url}/a` }, { url: `${srv.url}/b` }], opened, monitor);
  await srv.close();
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].monitor.name, "API");
});

test("a failing webhook is logged, not thrown", async () => {
  const logs = [];
  await notify([{ url: "http://127.0.0.1:1/hook" }], opened, monitor, { log: (m) => logs.push(m) });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /failed/);
});

test("slack and discord formats", () => {
  assert.deepEqual(payload(opened, monitor, "slack"), { text: "🔴 API is down: HTTP 502" });
  assert.deepEqual(payload(opened, monitor, "discord"), { content: "🔴 API is down: HTTP 502", username: "pulsewatch" });
  assert.equal(guessFormat("https://hooks.slack.com/services/T000/B000/XXXX"), "slack");
  assert.equal(guessFormat("https://discord.com/api/webhooks/1/abc"), "discord");
  assert.equal(guessFormat("https://example.com/hook"), "json");
});
