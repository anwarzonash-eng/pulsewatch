import { Router } from "express";
import { lastCheck, recentChecks } from "../db.js";
import { listIncidents } from "../incidents.js";
import { activeWindow, currentAndUpcoming } from "../maintenance.js";
import { DAY, dailyHistory, formatPercent, uptimeSummary } from "../stats.js";
import { badge } from "../views/badge.js";
import { renderStatus } from "../views/status.js";

export function pageRoutes({ config, db, byId }) {
  const router = Router();

  router.get("/", (req, res) => {
    const monitors = config.monitors.map((m) => ({
      id: m.id,
      name: m.name,
      last: lastCheck(db, m.id),
      recent: recentChecks(db, m.id, 40),
      history: dailyHistory(db, m.id, 90),
      uptime: uptimeSummary(db, m.id),
      maintenance: Boolean(activeWindow(config.maintenance, m.id)),
    }));
    const since = Date.now() - 14 * DAY;
    const incidents = listIncidents(db, { limit: 20 }).filter((i) => (i.resolvedAt ?? Date.now()) >= since);
    const maintenance = currentAndUpcoming(config.maintenance);
    res.type("html").send(renderStatus({ title: config.title, monitors, incidents, maintenance }));
  });

  // <img src="/badge/my-site.svg"> or /badge/my-site.svg?type=status
  router.get("/badge/:id.svg", (req, res) => {
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

  return router;
}
