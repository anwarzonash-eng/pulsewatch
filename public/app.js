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
