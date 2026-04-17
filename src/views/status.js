/** Server-rendered status page. */

export function renderStatus({ title, monitors, now = Date.now() }) {
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
    <footer>Updated ${new Date(now).toISOString().replace("T", " ").slice(0, 16)} UTC</footer>
  </main>
</body>
</html>`;
}

function renderMonitor(m) {
  const state = m.last == null ? "unknown" : m.last.ok ? "up" : "down";
  const label = { up: "Up", down: "Down", unknown: "No data" }[state];
  const detail = m.last ? `${m.last.ms} ms` : "";
  return `<li class="monitor ${state}"><span class="name">${m.name}</span><span class="state">${label}</span><span class="ms">${detail}</span></li>`;
}
