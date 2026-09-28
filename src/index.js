#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { openDb, pruneChecks, saveCheck } from "./db.js";
import { IncidentTracker } from "./incidents.js";
import { activeWindow } from "./maintenance.js";
import { notify } from "./notify.js";
import { startScheduler } from "./scheduler.js";
import { createApp } from "./server.js";

const configPath = process.argv[2] ?? process.env.PULSEWATCH_CONFIG ?? "pulsewatch.json";
let config;
try {
  config = loadConfig(configPath);
} catch (err) {
  console.error(`pulsewatch: ${err.message}`);
  process.exit(1);
}
const db = openDb(config.database);
const incidents = new IncidentTracker(db, { threshold: config.failuresBeforeIncident });

function onResult(monitor, result) {
  const window = activeWindow(config.maintenance, monitor.id);
  saveCheck(db, monitor.id, result, Date.now(), { maintenance: Boolean(window) });
  const state = window ? "mnt " : result.ok ? "up  " : "DOWN";
  console.log(`${state} ${monitor.name} ${result.status ?? "-"} ${result.ms}ms ${result.error ?? ""}`);
  // failures during planned maintenance do not open incidents
  if (window) return;
  const event = incidents.record(monitor, result);
  if (event) {
    console.log(`incident ${event.type}: ${monitor.name}`);
    notify(config.webhooks, event, monitor);
  }
}

let stopScheduler = startScheduler(config.monitors, onResult);

// keep the database small: drop old checks once at startup and then daily
const DAY = 24 * 60 * 60 * 1000;
const prune = () => {
  const removed = pruneChecks(db, Date.now() - config.retentionDays * DAY);
  if (removed) console.log(`pruned ${removed} checks older than ${config.retentionDays} days`);
};
prune();
setInterval(prune, DAY).unref();

const app = createApp({ config, db });
const server = app.listen(config.port, () => {
  console.log(`pulsewatch: watching ${config.monitors.length} monitor(s) on http://localhost:${config.port}`);
});

// Ctrl+C or `docker stop`: stop checking, finish open requests, close the db cleanly
let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`pulsewatch: ${signal}, shutting down`);
  stopScheduler();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// `kill -HUP <pid>` (or `systemctl reload`) re-reads the config without losing history
process.on("SIGHUP", () => {
  let next;
  try {
    next = loadConfig(configPath);
  } catch (err) {
    console.error(`pulsewatch: reload failed, keeping the old config\n${err.message}`);
    return;
  }
  if (next.port !== config.port || next.database !== config.database) {
    console.warn("pulsewatch: port and database changes need a restart");
  }
  stopScheduler();
  config = { ...next, port: config.port, database: config.database };
  app.locals.setConfig(config);
  incidents.threshold = config.failuresBeforeIncident;
  stopScheduler = startScheduler(config.monitors, onResult);
  console.log(`pulsewatch: reloaded, watching ${config.monitors.length} monitor(s)`);
});
