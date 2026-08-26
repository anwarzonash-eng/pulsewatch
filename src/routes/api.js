import { Router } from "express";
import { lastCheck, recentChecks } from "../db.js";
import { listIncidents } from "../incidents.js";
import { uptimeSummary } from "../stats.js";

const limitParam = (value, fallback, max) => Math.min(Number(value) || fallback, max);

export function apiRoutes(ctx) {
  const { db } = ctx;
  const router = Router();

  router.get("/monitors", (req, res) => {
    res.json(
      ctx.config.monitors.map((m) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        last: lastCheck(db, m.id),
        uptime: uptimeSummary(db, m.id),
      })),
    );
  });

  router.get("/monitors/:id/checks", (req, res) => {
    if (!ctx.byId.has(req.params.id)) return res.status(404).json({ error: "unknown monitor" });
    res.json(recentChecks(db, req.params.id, limitParam(req.query.limit, 50, 1000)));
  });

  // one call for dashboards and scripts: overall state plus each monitor
  router.get("/status", (req, res) => {
    const monitors = ctx.config.monitors.map((m) => {
      const last = lastCheck(db, m.id);
      return { id: m.id, name: m.name, state: last == null ? "unknown" : last.ok ? "up" : "down", lastCheckedAt: last?.at ?? null };
    });
    const open = listIncidents(db, { limit: 200 }).filter((i) => i.resolvedAt == null).length;
    const overall = monitors.some((m) => m.state === "down") ? "down" : monitors.every((m) => m.state === "up") ? "up" : "unknown";
    res.json({ state: overall, openIncidents: open, monitors });
  });

  router.get("/incidents", (req, res) => {
    res.json(listIncidents(db, { limit: limitParam(req.query.limit, 20, 200) }));
  });

  return router;
}
