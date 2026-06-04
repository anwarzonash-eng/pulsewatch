/** Send incident events to webhooks. */

export function message(event, monitor) {
  const { incident } = event;
  if (event.type === "opened") return `🔴 ${monitor.name} is down: ${incident.cause ?? "check failed"}`;
  const minutes = Math.max(1, Math.round((incident.resolvedAt - incident.startedAt) / 60000));
  return `🟢 ${monitor.name} is back up after ${minutes} min`;
}

export function payload(event, monitor) {
  return {
    event: event.type === "opened" ? "incident.opened" : "incident.resolved",
    monitor: { id: monitor.id, name: monitor.name, url: monitor.url },
    incident: event.incident,
    text: message(event, monitor),
  };
}

/**
 * POST the event to every webhook. Failures are logged, never thrown: a broken
 * webhook must not stop the monitoring.
 */
export async function notify(webhooks, event, monitor, { fetchImpl = fetch, log = console.error } = {}) {
  await Promise.all(
    webhooks.map(async (hook) => {
      try {
        const res = await fetchImpl(hook.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload(event, monitor)),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) log(`webhook ${hook.url} answered HTTP ${res.status}`);
      } catch (err) {
        log(`webhook ${hook.url} failed: ${err.message}`);
      }
    }),
  );
}
