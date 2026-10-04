# pulsewatch

Self-hosted uptime monitor and status page.

pulsewatch checks your websites, APIs and TCP services on a schedule, stores every result in SQLite, opens an incident when something stays down, sends webhooks (Slack, Discord or plain JSON) when it goes down and comes back, and serves a public status page with 90 days of history.

It is for people who run a few sites or side projects and want an honest status page without paying for a hosted service or running a full monitoring stack. One Node.js process, one database file, no accounts, no external services.

Built with Node.js 22+, Express 5 and better-sqlite3. The status page is server-rendered HTML with a few lines of optional JavaScript.

## Quick start

```bash
git clone https://github.com/anwarzonash-eng/pulsewatch.git
cd pulsewatch
npm install
cp pulsewatch.example.json pulsewatch.json   # git-ignored, edit it
npm start
```

Open http://localhost:3000.

### Docker

```bash
mkdir data && cp pulsewatch.example.json data/pulsewatch.json
docker compose up -d
```

See [docs/deploy.md](docs/deploy.md) for Docker, systemd, reverse proxies and backups.

## What you get

- **Status page**: overall state, each monitor with a response time sparkline, 30 day uptime, 90 day history bars, recent incidents and planned maintenance. Dark mode, times in the visitor's time zone, refreshes itself.
- **HTTP checks** with timeouts, expected status codes, a keyword that must be in the body, and extra headers.
- **TCP checks** for databases, SSH, mail servers and anything else with a port.
- **Incidents** that open after N failed checks in a row and resolve on the next success, and survive restarts.
- **Webhooks** for incident opened / resolved.
- **Maintenance windows**: failures do not open incidents or count against uptime.
- **Badges** for READMEs: `![uptime](https://status.example.com/badge/website.svg)`.
- **JSON API** for dashboards and scripts.

## Configuration

`pulsewatch.json`:

```json
{
  "title": "Acme Status",
  "port": 3000,
  "database": "pulsewatch.db",
  "failuresBeforeIncident": 2,
  "retentionDays": 90,
  "webhooks": ["https://hooks.slack.com/services/..."],
  "maintenance": [
    { "start": "2026-10-20T22:00:00Z", "end": "2026-10-20T23:00:00Z", "monitors": ["api"], "note": "Database upgrade" }
  ],
  "monitors": [
    { "name": "Website", "url": "https://example.com", "interval": 60 },
    { "name": "API", "url": "https://example.com/health", "interval": 30, "timeout": 5, "expectStatus": 200 },
    { "name": "Shop", "url": "https://shop.example.com", "keyword": "Add to cart" },
    { "name": "Admin health", "url": "https://example.com/admin/health", "headers": { "Authorization": "Bearer ${HEALTH_TOKEN}" } },
    { "name": "Postgres", "type": "tcp", "host": "db.internal", "port": 5432 }
  ]
}
```

| Key | Default | |
| --- | --- | --- |
| `title` | `"Status"` | Status page title |
| `port` | `3000` | HTTP port |
| `database` | `"pulsewatch.db"` | SQLite file |
| `failuresBeforeIncident` | `2` | Failed checks in a row before an incident opens |
| `retentionDays` | `90` | Checks older than this are deleted (incidents are kept) |
| `webhooks` | `[]` | URLs, or `{ "url": ..., "format": "json" \| "slack" \| "discord" }` |
| `maintenance` | `[]` | Windows with `start`, `end` (ISO dates), optional `monitors` (ids) and `note` |

Each monitor:

| Key | Default | |
| --- | --- | --- |
| `name` | the URL | Shown on the status page |
| `id` | from the name | Used in the API and badges: `"API health"` becomes `api-health` |
| `type` | `"http"` | `"http"` or `"tcp"` |
| `url` | required for http | What to check |
| `host`, `port` | required for tcp | Where to connect |
| `interval` | `60` | Seconds between checks (at least 5) |
| `timeout` | `10` | Seconds before a check fails (shorter than `interval`) |
| `method` | `"GET"` | `GET`, `HEAD` or `POST` |
| `keyword` | none | Text that must appear in the response body |
| `headers` | none | Extra request headers. `${NAME}` is replaced with an environment variable, so tokens stay out of the file |
| `expectStatus` | 2xx/3xx | Status that counts as up: `204`, `[200, 301]` or `"200-299"`. Redirects are not followed when set |

The config is validated at startup and every problem is listed at once. Send `SIGHUP` to reload it without losing history (port and database need a restart).

Environment variables `PORT`, `PULSEWATCH_DB`, `PULSEWATCH_TITLE` and `PULSEWATCH_CONFIG` override the file. See `.env.example`; `npm run start:env` loads `.env`.

## API

| Endpoint | |
| --- | --- |
| `GET /api/status` | Overall `up` / `down` / `unknown`, open incidents, each monitor's state |
| `GET /api/monitors` | Every monitor with its last check and uptime (24h, 7d, 30d) |
| `GET /api/monitors/:id/checks?limit=50` | Recent checks, newest first (max 1000) |
| `GET /api/incidents?limit=20` | Incidents, newest first |
| `GET /badge/:id.svg` | Uptime badge (30 days); `?type=status` for an up/down badge |

## Development

```bash
npm test      # node:test, including an end-to-end run of the real process
```

```
src/
  index.js        entry point: config, scheduler, server, signals
  config.js       loading, defaults, env overrides, validation
  checker.js      http and tcp checks
  scheduler.js    runs checks on their interval, never overlapping
  db.js           SQLite schema, migrations, checks
  incidents.js    incident tracking
  stats.js        uptime, response times, daily history
  maintenance.js  maintenance windows
  notify.js       webhooks
  routes/         api and page routes
  views/          status page, sparkline, badge
public/           css and the small client script
docs/deploy.md    deployment guide
```

## License

[MIT](LICENSE)
