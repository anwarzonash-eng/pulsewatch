import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseWindows } from "./maintenance.js";

const MONITOR_DEFAULTS = { interval: 60, timeout: 10, method: "GET" };
const METHODS = ["GET", "HEAD", "POST"];

export class ConfigError extends Error {
  constructor(problems) {
    super(`invalid config:\n  - ${problems.join("\n  - ")}`);
    this.problems = problems;
  }
}

/**
 * Settings that differ per deployment can come from the environment instead of
 * the file: PORT, PULSEWATCH_DB and PULSEWATCH_TITLE.
 */
export function applyEnv(raw, env = process.env) {
  const out = { ...raw };
  if (env.PORT) out.port = Number(env.PORT);
  if (env.PULSEWATCH_DB) out.database = env.PULSEWATCH_DB;
  if (env.PULSEWATCH_TITLE) out.title = env.PULSEWATCH_TITLE;
  return out;
}

/** Read pulsewatch.json, apply environment overrides and fill in defaults. */
export function loadConfig(path, env = process.env) {
  const file = resolve(path);
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`cannot read config ${file}: ${err.message}`);
  }
  return normalize(applyEnv(raw, env), env);
}

/**
 * Replace ${NAME} with the environment variable, so tokens for protected health
 * endpoints stay out of pulsewatch.json. Unknown names are reported, not left blank.
 */
export function expandEnv(text, env = process.env, problems = [], where = "") {
  return String(text).replace(/\$\{([A-Z0-9_]+)\}/g, (match, name) => {
    if (env[name] == null) {
      problems.push(`${where}: environment variable ${name} is not set`);
      return match;
    }
    return env[name];
  });
}

export function normalize(raw, env = process.env) {
  if (!Array.isArray(raw.monitors ?? [])) throw new ConfigError(["monitors must be a list"]);
  const monitors = (raw.monitors ?? []).map((m, i) => ({
    ...MONITOR_DEFAULTS,
    ...m,
    type: m.type ?? "http",
    id: m.id ?? slug(m.name ?? `monitor-${i + 1}`),
    name: m.name ?? m.url ?? `${m.host}:${m.port}`,
  }));
  const config = {
    title: raw.title ?? "Status",
    port: raw.port ?? 3000,
    database: raw.database ?? "pulsewatch.db",
    failuresBeforeIncident: raw.failuresBeforeIncident ?? 2,
    retentionDays: raw.retentionDays ?? 90,
    maintenance: parseWindows(raw.maintenance),
    webhooks: (raw.webhooks ?? []).map((h) => (typeof h === "string" ? { url: h } : h)),
    monitors,
  };
  const problems = validate(config);
  config.monitors.forEach((m, i) => {
    if (!m.headers) return;
    if (typeof m.headers !== "object" || Array.isArray(m.headers)) {
      problems.push(`monitors[${i}] (${m.name}): "headers" must be an object`);
      return;
    }
    m.headers = Object.fromEntries(
      Object.entries(m.headers).map(([k, v]) => [k, expandEnv(v, env, problems, `monitors[${i}] (${m.name}) header ${k}`)]),
    );
  });
  if (problems.length) throw new ConfigError(problems);
  return config;
}

/** Collect every problem at once, so you can fix the file in one go. */
export function validate(config) {
  const problems = [];
  const seen = new Set();
  config.monitors.forEach((m, i) => {
    const where = `monitors[${i}] (${m.name ?? "unnamed"})`;
    if (seen.has(m.id)) problems.push(`${where}: duplicate id "${m.id}"`);
    seen.add(m.id);

    if (m.type === "tcp") {
      if (!m.host) problems.push(`${where}: tcp checks need "host"`);
      if (!Number.isInteger(m.port) || m.port < 1 || m.port > 65535) problems.push(`${where}: "port" must be 1-65535`);
    } else if (m.type === "http") {
      if (!isHttpUrl(m.url)) problems.push(`${where}: "url" must be an http(s) URL`);
      if (!METHODS.includes(String(m.method).toUpperCase())) problems.push(`${where}: "method" must be one of ${METHODS.join(", ")}`);
    } else {
      problems.push(`${where}: "type" must be "http" or "tcp"`);
    }

    if (typeof m.interval !== "number" || m.interval < 5) problems.push(`${where}: "interval" must be at least 5 seconds`);
    if (typeof m.timeout !== "number" || m.timeout <= 0) problems.push(`${where}: "timeout" must be a positive number`);
    else if (m.timeout >= m.interval) problems.push(`${where}: "timeout" must be shorter than "interval"`);
  });

  config.webhooks.forEach((h, i) => {
    if (!isHttpUrl(h.url)) problems.push(`webhooks[${i}]: not an http(s) URL`);
  });
  config.maintenance.forEach((w, i) => {
    if (Number.isNaN(w.start) || Number.isNaN(w.end)) problems.push(`maintenance[${i}]: "start" and "end" must be ISO dates`);
    else if (w.end <= w.start) problems.push(`maintenance[${i}]: "end" must be after "start"`);
  });
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) problems.push(`"port" must be 1-65535`);
  return problems;
}

function isHttpUrl(text) {
  try {
    return ["http:", "https:"].includes(new URL(text).protocol);
  } catch {
    return false;
  }
}

export function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
