#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { openDb, pruneChecks, saveCheck } from "./db.js";
import { IncidentTracker } from "./incidents.js";
import { activeWindow } from "./maintenance.js";
import { notify } from "./notify.js";
import { startScheduler } from "./scheduler.js";
import { createApp } from "./server.js";

const configPath = process.argv[2] ?? "pulsewatch.json";
const config = loadConfig(configPath);
const db = openDb(config.database);
const incidents = new IncidentTracker(db, { threshold: config.failuresBeforeIncident });

startScheduler(config.monitors, (monitor, result) => {
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
});

// keep the database small: drop old checks once at startup and then daily
const DAY = 24 * 60 * 60 * 1000;
const prune = () => {
  const removed = pruneChecks(db, Date.now() - config.retentionDays * DAY);
  if (removed) console.log(`pruned ${removed} checks older than ${config.retentionDays} days`);
};
prune();
setInterval(prune, DAY).unref();

createApp({ config, db }).listen(config.port, () => {
  console.log(`pulsewatch: watching ${config.monitors.length} monitor(s) on http://localhost:${config.port}`);
});
