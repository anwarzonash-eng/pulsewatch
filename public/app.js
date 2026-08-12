// Show times in the visitor's own time zone. The server renders UTC so the
// page still makes sense without JavaScript.
const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

for (const el of document.querySelectorAll("time[datetime]")) {
  const date = new Date(el.getAttribute("datetime"));
  if (!Number.isNaN(date.getTime())) {
    el.textContent = format.format(date);
    el.title = date.toISOString();
  }
}

// Reload once a minute so a status page left open stays current,
// but not while the tab is in the background.
const REFRESH_MS = 60_000;
let loadedAt = Date.now();
setInterval(() => {
  if (document.visibilityState === "visible" && Date.now() - loadedAt >= REFRESH_MS) {
    loadedAt = Date.now();
    location.reload();
  }
}, 5_000);
