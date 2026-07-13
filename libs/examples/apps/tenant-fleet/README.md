# tenant-fleet

A multi-tenant provisioner where every tenant runs as its own sovereign CReact
runtime. `tenants.json` declares the fleet. For each tenant, the app mounts a
`createRuntime`-wrapped tree with its own file ledger under `./ledgers/<name>`,
and a fleet status component aggregates every child runtime's
status/ready/error outputs into one summary line. No external services.

Each tenant tree is a real two-resource stack: a `TenantDatabase` that
simulates provisioning and persists a durable `provisionedAt` timestamp, and a
`TenantApi` that waits for the database's connection string before it deploys.

## Run it

```bash
npm start
```

`npm start` runs `creact --watch index.tsx`, which keeps the fleet manager
alive so you can edit `tenants.json` while it runs. A plain
`npx creact index.tsx` is a one-shot converge: it deploys every tenant,
persists all ledgers, and exits.

Expected output shortly after boot:

```
[fleet] spec: 1. acme [us-east-1]  2. globex [eu-west-1]  3. initech [ap-southeast-2]
[fleet] acme: attaching | globex: attaching | initech: attaching
[fleet] acme: ready | globex: ready | initech: ready
```

## Edit the fleet live

The app re-reads `tenants.json` every two seconds. While it runs, add a
tenant:

```json
{ "name": "umbrella", "region": "us-west-2", "plan": "pro" }
```

Within a couple of seconds the roster line updates, a new runtime attaches,
`./ledgers/umbrella/` appears, and the summary reports the new tenant moving
from attaching to ready. Delete the entry and the runtime detaches again.

## Ledger layout

```
ledgers/
  fleet/tenant-fleet.json                  the fleet runtime's own ledger
  acme/tenant-tree-runtime-acme.json       acme's sovereign ledger
  globex/tenant-tree-runtime-globex.json   globex's sovereign ledger
  initech/tenant-tree-runtime-initech.json initech's sovereign ledger
```

The fleet ledger holds one wrapper node per tenant with the runtime-provided
outputs `status`, `ready`, and `error` — that is exactly what `FleetStatus`
reads. Each tenant ledger holds the tenant's own resources, named by the
wrapper's address: the stack `tenant-tree-runtime-acme` is the same identity
scheme at every level.

## Detach is not destroy

Removing a tenant from `tenants.json` unmounts its runtime: its handlers stop
and its wrapper node leaves the fleet ledger, but `ledgers/<name>/` stays on
disk. Re-adding the tenant re-hydrates from that ledger and re-converges —
`provisionedAt` proves it, because the timestamp survives detach, restart,
and re-attach. Destroying a tenant is only ever an explicit act against its
own Memory: stop the app and delete `ledgers/<name>/`.

Child runtime failures never throw through the fleet. A tenant that fails to
deploy surfaces as `status: "failed"` with an `error` message on its wrapper
node, and the fleet summary prints it while the other tenants keep running.

## Tests

```bash
cd ../.. && npx vitest --run apps/tenant-fleet
```
