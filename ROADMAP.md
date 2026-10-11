# Roadmap

Planned work, roughly in order. Ideas and bug reports are welcome as issues.

## 0.2 – alerts people actually read
- [ ] Email notifications over SMTP (credentials from the environment)
- [ ] Telegram and ntfy webhook formats
- [ ] Reminder notifications while an incident stays open (every N hours)
- [ ] Flap detection: do not alert when a monitor goes up and down repeatedly
- [ ] Per-monitor webhook lists and quiet hours

## 0.3 – more kinds of checks
- [ ] TLS certificate expiry warnings (days left in the API and on the page)
- [ ] DNS checks (record exists / resolves to an expected value)
- [ ] JSON body assertions (`"$.status": "ok"`)
- [ ] Heartbeat / push monitors: a cron job calls pulsewatch, and silence is the failure
- [ ] Checks from more than one location (a small agent that reports back)

## 0.4 – status page
- [ ] Manual incident notes and updates ("investigating", "fixed") from a small admin page with a token
- [ ] Groups of monitors and a custom order
- [ ] Response time chart per monitor with a time range picker
- [ ] RSS / Atom feed of incidents
- [ ] Custom logo, colors and footer links

## Operations
- [ ] Prometheus `/metrics` endpoint
- [ ] Downsample old checks into hourly rows instead of deleting them
- [ ] Config in YAML as an alternative to JSON
- [ ] Publish a Docker image (GHCR) from CI on tags
- [ ] Load test with a few hundred monitors and document the limits
- [ ] Windows service instructions
