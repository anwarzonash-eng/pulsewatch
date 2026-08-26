# Deploying pulsewatch

pulsewatch is one Node.js process and one SQLite file. Anything that can keep a process running works.

## Docker Compose

```bash
mkdir data
cp pulsewatch.example.json data/pulsewatch.json   # edit it
docker compose up -d
docker compose logs -f
```

The database lives in `./data/pulsewatch.db` and survives container rebuilds.

## systemd

```ini
# /etc/systemd/system/pulsewatch.service
[Unit]
Description=pulsewatch uptime monitor
After=network-online.target

[Service]
WorkingDirectory=/opt/pulsewatch
ExecStart=/usr/bin/node src/index.js /etc/pulsewatch/pulsewatch.json
Environment=PULSEWATCH_DB=/var/lib/pulsewatch/pulsewatch.db
Restart=on-failure
User=pulsewatch

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now pulsewatch
```

Add `ExecReload=/bin/kill -HUP $MAINPID` to the service so `systemctl reload pulsewatch` picks up config changes without a restart. Monitors, webhooks and maintenance windows are reloaded; `port` and `database` need a restart.

## Behind a reverse proxy

Run pulsewatch on localhost and let nginx or Caddy handle TLS:

```
# Caddyfile
status.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

The status page, badges and API are read-only, so they can be public. There is nothing to log in to.

## Backups

The SQLite file can be copied while pulsewatch runs (it uses WAL mode), but the safest way is:

```bash
sqlite3 pulsewatch.db ".backup backup.db"
```
