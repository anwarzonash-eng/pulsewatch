#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { openDb, saveCheck } from "./db.js";
import { startScheduler } from "./scheduler.js";
import { createApp } from "./server.js";

const configPath = process.argv[2] ?? "pulsewatch.json";
const config = loadConfig(configPath);
const db = openDb(config.database);

startScheduler(config.monitors, (monitor, result) => {
  saveCheck(db, monitor.id, result);
  const state = result.ok ? "up  " : "DOWN";
  console.log(`${state} ${monitor.name} ${result.status ?? "-"} ${result.ms}ms ${result.error ?? ""}`);
});

createApp({ config, db }).listen(config.port, () => {
  console.log(`pulsewatch: watching ${config.monitors.length} monitor(s) on http://localhost:${config.port}`);
});
