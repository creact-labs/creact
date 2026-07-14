# uptime-monitor

An uptime monitor built as a CReact app. It probes real URLs on an interval,
tracks status transitions, accumulates durable uptime tallies, alerts once per
incident, and publishes a static status page. It runs end to end with zero
configuration — real `fetch`, real timers, real filesystem writes.

The default target list includes `https://localhost:1`, a retired endpoint
that always refuses connections, so you can watch the failure path fire on
every run: an incident opens, an alert is logged once, and the overall status
rolls up to degraded.

## Run it

```bash
npm start
```

Expected console output after the first sweep:

```
[probe] Example: up in 180ms
[probe] Retired API: down in 2ms
[probe] Wikipedia: up in 240ms
[alert] 2026-07-12T10:00:00.000Z ALERT Retired API is down (https://localhost:1)
[monitor] degraded — down: Retired API
[status-page] wrote ./out/status.html
```

Every five seconds another sweep runs, each probe logs its result, and the
status page is rewritten from the latest reactive state.

## Output files

- `./out/status.html` — the published status page: overall rollup, per-target
  status, uptime percentage, and last probe latency. Rewritten on every change.
- `./out/alerts.log` — one line per incident, appended the first time a target
  transitions to down. A recovered target re-arms the alert for its next
  incident. Incident tracking itself is in-memory, so a restart re-opens
  incidents for targets that are still down and logs a fresh alert.

## How state persists

The entry point passes a `FileMemory` ledger rooted at `./.state` to
`render()`. Each `HttpCheck` owns a durable resource whose outputs are the
cumulative `checksRun` and `checksFailed` counters. Stop the app and start it
again: the handler re-runs, `setOutputs(prev => ...)` receives the persisted
counters, and the uptime percentages on the status page continue from where
they left off instead of resetting to 100.

Delete `./.state` to start the history from scratch.
