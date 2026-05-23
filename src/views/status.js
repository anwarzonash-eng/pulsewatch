/** Server-rendered status page. */
import { formatPercent } from "../stats.js";
import { sparkline } from "./sparkline.js";

export function renderStatus({ title, monitors, incidents = [], now = Date.now() }) {
  const allUp = monitors.every((m) => m.last?.ok);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p class="summary ${allUp ? "up" : "down"}">${allUp ? "All systems operational" : "Some systems are down"}</p>
    <ul class="monitors">
      ${monitors.map(renderMonitor).join("\n      ")}
    </ul>
    <h2>Recent incidents</h2>
    ${renderIncidents(incidents, monitors, now)}
    <footer>Updated ${new Date(now).toISOString().replace("T", " ").slice(0, 16)} UTC</footer>
  </main>
</body>
</html>`;
}

function renderMonitor(m) {
  const state = m.last == null ? "unknown" : m.last.ok ? "up" : "down";
  const label = { up: "Up", down: "Down", unknown: "No data" }[state];
  const detail = m.last ? `${m.last.ms} ms` : "";
  const uptime = m.uptime ? `<span class="uptime" title="last 30 days">${formatPercent(m.uptime.month)}</span>` : "";
  const spark = m.recent ? sparkline(m.recent) : "";
  return `<li class="monitor ${state}"><span class="name">${m.name}</span>${spark}${uptime}<span class="state">${label}</span><span class="ms">${detail}</span></li>`;
}

function renderIncidents(incidents, monitors, now) {
  if (incidents.length === 0) return `<p class="none">No incidents in the last 14 days.</p>`;
  const names = new Map(monitors.map((m) => [m.id, m.name]));
  const items = incidents.map((i) => {
    const end = i.resolvedAt ?? now;
    const state = i.resolvedAt ? "Resolved" : "Ongoing";
    return `<li class="incident ${i.resolvedAt ? "resolved" : "ongoing"}">
        <strong>${names.get(i.monitorId) ?? i.monitorId}</strong> <span class="badge">${state}</span>
        <div class="when">${formatTime(i.startedAt)} UTC, ${formatDuration(end - i.startedAt)}</div>
        <div class="cause">${i.cause ?? ""}</div>
      </li>`;
  });
  return `<ul class="incidents">\n      ${items.join("\n      ")}\n    </ul>`;
}

function formatTime(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}

export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}
