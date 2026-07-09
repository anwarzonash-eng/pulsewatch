import express from "express";
import { fileURLToPath } from "node:url";
import { apiRoutes } from "./routes/api.js";
import { pageRoutes } from "./routes/pages.js";

export function createApp({ config, db }) {
  const app = express();
  const ctx = { config, db, byId: new Map(config.monitors.map((m) => [m.id, m])) };

  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));
  app.use("/api", apiRoutes(ctx));
  app.use(pageRoutes(ctx));
  return app;
}
