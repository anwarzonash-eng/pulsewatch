import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MONITOR_DEFAULTS = { interval: 60, timeout: 10, method: "GET" };

/** Read pulsewatch.json and fill in defaults. */
export function loadConfig(path) {
  const file = resolve(path);
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`cannot read config ${file}: ${err.message}`);
  }
  return normalize(raw);
}

export function normalize(raw) {
  const monitors = (raw.monitors ?? []).map((m, i) => ({
    ...MONITOR_DEFAULTS,
    ...m,
    id: m.id ?? slug(m.name ?? `monitor-${i + 1}`),
    name: m.name ?? m.url,
  }));
  return {
    title: raw.title ?? "Status",
    port: raw.port ?? 3000,
    database: raw.database ?? "pulsewatch.db",
    failuresBeforeIncident: raw.failuresBeforeIncident ?? 2,
    monitors,
  };
}

export function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
