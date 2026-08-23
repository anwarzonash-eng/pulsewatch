# pulsewatch

Self-hosted uptime monitor and status page. It checks your websites and APIs on a schedule, keeps the results in SQLite, opens an incident when something stays down, sends a webhook (Slack, Discord or plain JSON), and serves a public status page.

Built with Node.js, Express and better-sqlite3. One process, one database file, no external services.

## Setup

Needs Node.js 22+.

```bash
npm install
cp pulsewatch.example.json pulsewatch.json   # git-ignored, edit it
npm start                                    # or: node src/index.js path/to/config.json
```

Then open http://localhost:3000.

`PORT`, `PULSEWATCH_DB`, `PULSEWATCH_TITLE` and `PULSEWATCH_CONFIG` override the file, which is handy in containers. See `.env.example` (`npm run start:env` loads `.env`).

### Docker

```bash
docker build -t pulsewatch .
docker run -d -p 3000:3000 -v "$PWD/data:/data" pulsewatch
```

Put `pulsewatch.json` in `./data` and set `"database": "/data/pulsewatch.db"` in it so the history survives restarts. There is also a `docker-compose.yml`; see [docs/deploy.md](docs/deploy.md) for Compose, systemd and reverse proxy setups.

## Configuration

```json
{
  "title": "Acme Status",
  "port": 3000,
  "database": "pulsewatch.db",
  "failuresBeforeIncident": 2,
  "retentionDays": 90,
  "webhooks": ["https://hooks.slack.com/services/..."],
  "monitors": [
    { "name": "Website", "url": "https://example.com", "interval": 60 },
    { "name": "API", "url": "https://example.com/health", "interval": 30, "timeout": 5 },
    { "name": "Shop", "url": "https://shop.example.com", "keyword": "Add to cart" }
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

Each monitor:

| Key | Default | |
| --- | --- | --- |
| `name` | the URL | Shown on the status page |
| `id` | from the name | Used in the API, e.g. `"API health"` becomes `api-health` |
| `url` | required | What to check |
| `interval` | `60` | Seconds between checks |
| `timeout` | `10` | Seconds before a check counts as failed |
| `method` | `"GET"` | HTTP method |
| `keyword` | none | Text that must appear in the response body |

A check is up when the response is 2xx or 3xx (after redirects) and contains the keyword, if one is set.

For anything that is not HTTP (a database, SSH, a mail server), use a TCP check. It is up when a connection opens:

```json
{ "name": "Postgres", "type": "tcp", "host": "db.internal", "port": 5432, "interval": 60 }
```

Webhook format is guessed from the URL for Slack and Discord; anything else gets JSON with `event` (`incident.opened` or `incident.resolved`), `monitor`, `incident` and a `text` line.

## API

- `GET /api/status` - overall `up` / `down` / `unknown`, number of open incidents, and each monitor's state
- `GET /api/monitors` - every monitor with its last check and uptime (24h, 7d, 30d)
- `GET /api/monitors/:id/checks?limit=50` - recent checks, newest first
- `GET /api/incidents?limit=20` - incidents, newest first
- `GET /badge/:id.svg` - uptime badge (30 days); `?type=status` for an up/down badge

```markdown
![uptime](https://status.example.com/badge/website.svg)
```

## Tests

```bash
npm test
```
