import { Router } from "express";
import { lastCheck, recentChecks } from "../db.js";
import { listIncidents } from "../incidents.js";
import { uptimeSummary } from "../stats.js";

const limitParam = (value, fallback, max) => Math.min(Number(value) || fallback, max);

export function apiRoutes({ config, db, byId }) {
  const router = Router();

  router.get("/monitors", (req, res) => {
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

  router.get("/monitors/:id/checks", (req, res) => {
    if (!byId.has(req.params.id)) return res.status(404).json({ error: "unknown monitor" });
    res.json(recentChecks(db, req.params.id, limitParam(req.query.limit, 50, 1000)));
  });

  router.get("/incidents", (req, res) => {
    res.json(listIncidents(db, { limit: limitParam(req.query.limit, 20, 200) }));
  });

  return router;
}
