# Changelog

## 0.1.0

First tagged version.

- HTTP checks with timeout, keyword, expected status codes and headers (`${ENV}` values)
- TCP checks
- SQLite storage with WAL mode, indexes, migrations and retention
- Incidents after N failures in a row, kept across restarts
- Webhooks: JSON, Slack and Discord
- Maintenance windows that do not count against uptime
- Status page: sparklines, 30 day uptime, 90 day history, incidents, maintenance, dark mode, local times, auto refresh
- SVG badges and a JSON API (`/api/status`, `/api/monitors`, `/api/incidents`)
- Config validation, env overrides, reload on SIGHUP, graceful shutdown
- Dockerfile, docker-compose and a deployment guide
