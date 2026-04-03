#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { openDb, saveCheck } from "./db.js";
import { startScheduler } from "./scheduler.js";

const configPath = process.argv[2] ?? "pulsewatch.json";
const config = loadConfig(configPath);
const db = openDb(config.database);

startScheduler(config.monitors, (monitor, result) => {
  saveCheck(db, monitor.id, result);
  const state = result.ok ? "up  " : "DOWN";
  console.log(`${state} ${monitor.name} ${result.status ?? "-"} ${result.ms}ms ${result.error ?? ""}`);
});

console.log(`pulsewatch: watching ${config.monitors.length} monitor(s)`);
