# pulsewatch

Self-hosted uptime monitor. It checks your websites and APIs on a schedule, keeps the results in SQLite and serves them over a small JSON API.

Built with Node.js, Express and better-sqlite3.

## Setup

Needs Node.js 22+.

```bash
npm install
```

Create `pulsewatch.json`:

```json
{
  "port": 3000,
  "monitors": [
    { "name": "My site", "url": "https://example.com", "interval": 60 },
    { "name": "API health", "url": "https://example.com/health", "interval": 30, "timeout": 5 }
  ]
}
```

```bash
npm start            # or: node src/index.js path/to/config.json
```

- `GET /api/monitors` - every monitor with its last check
- `GET /api/monitors/:id/checks?limit=50` - recent checks, newest first

## Tests

```bash
npm test
```
