import express from "express";
import { fileURLToPath } from "node:url";
import { apiRoutes } from "./routes/api.js";
import { pageRoutes } from "./routes/pages.js";

export function createApp({ config, db }) {
  const app = express();
  const ctx = { db, config, byId: null };
  const setConfig = (next) => {
    ctx.config = next;
    ctx.byId = new Map(next.monitors.map((m) => [m.id, m]));
  };
  setConfig(config);

  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));
  app.use("/api", apiRoutes(ctx));
  app.use(pageRoutes(ctx));
  app.locals.setConfig = setConfig;
  return app;
}
