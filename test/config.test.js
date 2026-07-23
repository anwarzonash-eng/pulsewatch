import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, normalize, slug } from "../src/config.js";

test("defaults", () => {
  const c = normalize({ monitors: [{ name: "My API!", url: "https://api.example.com" }] });
  assert.equal(c.title, "Status");
  assert.equal(c.port, 3000);
  assert.deepEqual(
    { id: c.monitors[0].id, type: c.monitors[0].type, interval: c.monitors[0].interval, timeout: c.monitors[0].timeout },
    { id: "my-api", type: "http", interval: 60, timeout: 10 },
  );
  assert.equal(slug("  Hello, World  "), "hello-world");
});

test("webhooks as strings or objects", () => {
  const c = normalize({ webhooks: ["https://example.com/a", { url: "https://example.com/b", format: "slack" }] });
  assert.deepEqual(c.webhooks, [{ url: "https://example.com/a" }, { url: "https://example.com/b", format: "slack" }]);
});

test("reports every problem at once", () => {
  try {
    normalize({
      port: 0,
      monitors: [
        { name: "a", url: "ftp://example.com" },
        { name: "a", url: "https://example.com", interval: 2 },
        { name: "db", type: "tcp", port: 70000 },
        { name: "x", type: "udp", url: "https://example.com" },
        { name: "slow", url: "https://example.com", interval: 10, timeout: 10 },
      ],
      webhooks: ["not a url"],
      maintenance: [{ start: "2026-07-01T10:00:00Z", end: "2026-07-01T09:00:00Z" }],
    });
    assert.fail("should throw");
  } catch (err) {
    assert.ok(err instanceof ConfigError);
    const text = err.problems.join("\n");
    assert.match(text, /monitors\[0\] \(a\): "url" must be an http\(s\) URL/);
    assert.match(text, /duplicate id "a"/);
    assert.match(text, /at least 5 seconds/);
    assert.match(text, /tcp checks need "host"/);
    assert.match(text, /"port" must be 1-65535/);
    assert.match(text, /"type" must be "http" or "tcp"/);
    assert.match(text, /shorter than "interval"/);
    assert.match(text, /webhooks\[0\]/);
    assert.match(text, /"end" must be after "start"/);
    assert.match(err.message, /^invalid config:\n  - /);
  }
});

test("monitors must be a list", () => {
  assert.throws(() => normalize({ monitors: {} }), /monitors must be a list/);
});
