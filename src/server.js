import express from "express";
import { fileURLToPath } from "node:url";
import { lastCheck, recentChecks } from "./db.js";
import { uptimeSummary } from "./stats.js";
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

  app.get("/", (req, res) => {
    const monitors = config.monitors.map((m) => ({
      name: m.name,
      last: lastCheck(db, m.id),
      uptime: uptimeSummary(db, m.id),
    }));
    res.type("html").send(renderStatus({ title: config.title, monitors }));
  });

  return app;
}
