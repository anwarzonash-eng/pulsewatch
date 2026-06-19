import express from "express";
import { fileURLToPath } from "node:url";
import { lastCheck, recentChecks } from "./db.js";
import { listIncidents } from "./incidents.js";
import { DAY, formatPercent, uptimeSummary } from "./stats.js";
import { badge } from "./views/badge.js";
import { renderStatus } from "./views/status.js";

export function createApp({ config, db }) {
  const app = express();
  const byId = new Map(config.monitors.map((m) => [m.id, m]));

  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));

  app.get("/api/monitors", (req, res) => {
    res.json(
      config.monitors.map((m) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        last: lastCheck(db, m.id),
        uptime: uptimeSummary(db, m.id),
      })),
    );
  });

  app.get("/api/monitors/:id/checks", (req, res) => {
    if (!byId.has(req.params.id)) return res.status(404).json({ error: "unknown monitor" });
    const limit = Math.min(Number(req.query.limit) || 50, 1000);
    res.json(recentChecks(db, req.params.id, limit));
  });

  app.get("/api/incidents", (req, res) => {
    res.json(listIncidents(db, { limit: Math.min(Number(req.query.limit) || 20, 200) }));
  });

  // <img src="/badge/my-site.svg"> or /badge/my-site.svg?type=status
  app.get("/badge/:id.svg", (req, res) => {
    const monitor = byId.get(req.params.id);
    if (!monitor) return res.status(404).type("svg").send(badge("pulsewatch", "not found", "unknown"));
    const last = lastCheck(db, monitor.id);
    const state = last == null ? "unknown" : last.ok ? "up" : "down";
    const svg =
      req.query.type === "status"
        ? badge("status", { up: "up", down: "down", unknown: "no data" }[state], state)
        : badge("uptime", formatPercent(uptimeSummary(db, monitor.id).month), state);
    res.type("svg").send(svg);
  });

  app.get("/", (req, res) => {
    const monitors = config.monitors.map((m) => ({
      id: m.id,
      name: m.name,
      last: lastCheck(db, m.id),
      recent: recentChecks(db, m.id, 40),
      uptime: uptimeSummary(db, m.id),
    }));
    const since = Date.now() - 14 * DAY;
    const incidents = listIncidents(db, { limit: 20 }).filter((i) => (i.resolvedAt ?? Date.now()) >= since);
    res.type("html").send(renderStatus({ title: config.title, monitors, incidents }));
  });

  return app;
}
