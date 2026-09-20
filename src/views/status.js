/** Server-rendered status page. */
import { formatPercent } from "../stats.js";
import { sparkline } from "./sparkline.js";

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Names, notes and error messages end up in HTML; never trust them. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

export function renderStatus({ title: rawTitle, monitors, incidents = [], maintenance = [], now = Date.now() }) {
  const title = escapeHtml(rawTitle);
  const allUp = monitors.every((m) => m.maintenance || m.last?.ok);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
  <script src="/app.js" defer></script>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p class="summary ${allUp ? "up" : "down"}">${allUp ? "All systems operational" : "Some systems are down"}</p>
    ${renderMaintenance(maintenance, now)}
    <ul class="monitors">
      ${monitors.map(renderMonitor).join("\n      ")}
    </ul>
    <h2>Recent incidents</h2>
    ${renderIncidents(incidents, monitors, now)}
    <footer>Updated ${timeTag(now)}</footer>
  </main>
</body>
</html>`;
}

function renderMonitor(m) {
  const state = m.maintenance ? "maintenance" : m.last == null ? "unknown" : m.last.ok ? "up" : "down";
  const label = { up: "Up", down: "Down", unknown: "No data", maintenance: "Maintenance" }[state];
  const detail = m.last ? `${m.last.ms} ms` : "";
  const uptime = m.uptime ? `<span class="uptime" title="last 30 days">${formatPercent(m.uptime.month)}</span>` : "";
  const spark = m.recent ? sparkline(m.recent) : "";
  const history = m.history ? renderHistory(m.history) : "";
  return `<li class="monitor ${state}"><div class="row"><span class="name">${escapeHtml(m.name)}</span>${spark}${uptime}<span class="state">${label}</span><span class="ms">${detail}</span></div>${history}</li>`;
}

function renderIncidents(incidents, monitors, now) {
  if (incidents.length === 0) return `<p class="none">No incidents in the last 14 days.</p>`;
  const names = new Map(monitors.map((m) => [m.id, m.name]));
  const items = incidents.map((i) => {
    const end = i.resolvedAt ?? now;
    const state = i.resolvedAt ? "Resolved" : "Ongoing";
    return `<li class="incident ${i.resolvedAt ? "resolved" : "ongoing"}">
        <strong>${escapeHtml(names.get(i.monitorId) ?? i.monitorId)}</strong> <span class="badge">${state}</span>
        <div class="when">${timeTag(i.startedAt)}, ${formatDuration(end - i.startedAt)}</div>
        <div class="cause">${escapeHtml(i.cause)}</div>
      </li>`;
  });
  return `<ul class="incidents">\n      ${items.join("\n      ")}\n    </ul>`;
}

function formatTime(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}

/** <time> with a UTC fallback text; public/app.js swaps in local time. */
function timeTag(ms) {
  return `<time datetime="${new Date(ms).toISOString()}">${formatTime(ms)} UTC</time>`;
}

export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

function renderMaintenance(windows, now) {
  if (windows.length === 0) return "";
  const items = windows.map((w) => {
    const when = w.start <= now ? `now, until ${timeTag(w.end)}` : `${timeTag(w.start)} – ${timeTag(w.end)}`;
    return `<li><strong>${escapeHtml(w.note || "Planned maintenance")}</strong> <span class="when">${when}</span></li>`;
  });
  return `<ul class="maintenance">${items.join("")}</ul>`;
}

export function historyClass(uptime) {
  if (uptime == null) return "none";
  if (uptime >= 99.9) return "good";
  if (uptime >= 95) return "warn";
  return "bad";
}

function renderHistory(days) {
  const bars = days.map((d) => {
    const title = `${d.date}: ${d.uptime == null ? "no data" : formatPercent(d.uptime)}`;
    return `<span class="bar ${historyClass(d.uptime)}" title="${title}"></span>`;
  });
  return `<div class="history" aria-label="uptime for the last ${days.length} days">${bars.join("")}</div>`;
}
