# CReact Runtime Audit — 2026-07-11

Precise map of the runtime + findings from a bug hunt focused on fiber/state
reconciliation and the lock system. Each finding lists status: **FIXED**,
**DOCUMENTED** (intentional or low-risk, left as-is), or **LIMITATION** (inherent design).

## How the runtime works, precisely

### Boot (`render()` → `CReactRuntime.run()`, `runtime/src/run.ts`)

1. `render(fn, memory, stackName)` creates a `CReactRuntime`, opens a `createRoot`
   reactive scope, calls `fn()` once, force-sets `element.key = stackName`, and kicks
   off `runtime.run(element)`. Returns `{ dispose, getNodes, ready, settled }` synchronously.
2. `run()` checks `StateMachine.canResume` (previous status `"applying"` means a crash
   mid-deploy) and reads `applyingNodeIds` (interrupted in-flight nodes).
3. Previous state hydrates three maps **before** components execute:
   - `restoreResourceStates` — node id → `"deployed"`/`"pending"`.
   - `prepareHydration` — `createStore` values by component path (`store/src/store.ts`).
   - `prepareOutputHydration` — node id → persisted outputs (`runtime/src/instance.ts`).
   - `previousNodes` = persisted nodes **with non-empty outputs** (nodes that never
     produced outputs are treated as new creates).
4. `renderFiber(element, [])` builds the fiber tree. Components execute exactly once.
   `useAsyncOutput` registers an `InstanceNode` in a module-level `nodeRegistry`, keyed by
   `resourcePath + kebab(componentName) + key`. Only components that call `useAsyncOutput`
   contribute a segment to the resource path (so refactoring pure-composition components
   does not change persisted IDs).
5. `collectInstanceNodes(rootFiber)` walks the fiber tree and returns **snapshots**
   (`{...node}` spreads) of every instance node, in tree order.
6. `applyChanges(previousNodes, isInitialRun=true)` reconciles and deploys.

### Reconciliation (`runtime/src/reconcile.ts`)

- Matching is purely **by node id** (path-based). `reconcile(prev, curr)` produces
  `creates` (id not in prev), `updates` (id in both, `deepEqual(props)` false),
  `deletes` (id not in curr).
- `buildDependencyGraph` derives edges from the resource path: each node depends on its
  nearest ancestor that is also an instance node. Siblings are independent.
- `topologicalSort` (Kahn) orders deployment; cycles are warned and appended.
- `getReadyNodes` treats a dependency as satisfied if deployed, or unknown to this pass
  (not pending/running).

### Deployment executor (`applyChangesInternal`, run.ts)

- Deletes run first, in reverse topological order: node's `cleanupFn` is awaited, then
  `recordResourceDestroyed`.
- Creates/updates (+ **all** unchanged nodes on initial run — handlers are idempotent and
  re-establish side effects) go into a `pending` set. A work loop launches every ready
  node concurrently, `Promise.race`s completions, and after **each** completion re-collects
  the fiber tree (**eager cascade**): outputs set by a handler may have materialized new
  children via `Show`/`For`, which join `pending` immediately. Mid-cascade deletes are
  deferred to the end. A handler failure fail-fasts the whole deployment
  (`failDeployment`, status `"failed"`, `ready` rejects).
- Per-node persistence protocol, in order: `addApplying(id)` → run handler →
  `removeApplying(id)` → `updateNodeOutputs(id, outputs)` → audit log. `applyingNodeIds`
  is the crash-recovery breadcrumb.
- After the loop, a safety-net re-collect either recurses into `applyChangesInternal`
  or calls `completeDeployment` (status `"deployed"`, full node snapshot).

### Reactive flush loop

- Signal writes → `runUpdates`/`completeUpdates` (`src/reactive/tracking.ts`) → flush
  callback → `handleReactiveFlush`. If a deployment is applying, sets `pendingFlush`;
  otherwise `doFlush()` re-collects, reconciles, and applies. If only outputs changed
  (no node/prop diffs), state save is debounced 100 ms.
- `settled()` spins until no active flush, no applying, no pending flush, no pending save.

### State machine & locks (`runtime/src/state-machine.ts`)

- All persisted-state mutations (`startDeployment`, `updateNodeOutputs`, `addApplying`,
  `removeApplying`, `completeDeployment`, `failDeployment`) are serialized per stack via
  an in-process `AsyncMutex` (FIFO handoff, `runtime/src/async-mutex.ts`).
- Cross-process protection is the optional `Memory.acquireLock`/`releaseLock` — see F1.

## Findings

### F1. Lock system was dead code (half-wired) — FIXED
`Memory.acquireLock/releaseLock` and `StateMachine.acquireLock/releaseLock` existed but
**nothing ever called them**. Two runtimes rendering the same stack against the same
backend would interleave `saveState` writes with zero protection.
**Fix:** `run()` now acquires the stack lock before deploying (throws
`Stack "<name>" is locked` if unavailable — `ready` rejects) and `dispose()` releases it.
Backends without lock support behave as before (acquire always succeeds).

### F2. Interrupted-deploy recovery was half-wired — FIXED
`run()` called `canResume()` and then `getInterruptedNodeIds()` **and discarded the
result** — two wasted Memory reads. **Fix:** interrupted node ids are now surfaced via a
`console.warn` (handlers re-run idempotently on startup anyway, so re-running them *is*
the recovery; the warning makes it observable).

### F3. `settled()` could starve the event loop — FIXED
While `isApplying`, `settled()` awaited `queueMicrotask` in a loop. A continuously
non-empty microtask queue prevents the event loop from ever reaching timers, so calling
`settled()` before `ready` (with any handler awaiting a `setTimeout`) hung the process.
**Fix:** waits now yield through `setTimeout(0)` (macrotask) instead.

### F4. Deleted nodes leaked in the registry → double cleanup — FIXED
The delete path called the snapshot's `cleanupFn` but left the live node (with its
`cleanupFn` still set) in `nodeRegistry`. A later `resetRuntime()` /
`callAllCleanupFunctions()` invoked the same cleanup a second time, and deleted nodes
accumulated forever (leak). **Fix:** deletes now remove the node from the registry and
ownership maps via `removeNodeFromRegistry`.

### F4b. Deletes read `cleanupFn` from stale snapshots — FIXED
The delete paths called `node.cleanupFn` on the reconciler's *snapshot* of the node.
`currentNodes` snapshots are only refreshed when the fiber tree changes, so a node that
deployed without any tree change kept a pre-handler snapshot with `cleanupFn: undefined`
— deleting it mid-deployment silently skipped teardown (found by the deferred-delete
test). **Fix:** deletes now prefer the live registry node's `cleanupFn`.

### F5. Mid-cascade prop updates to already-deployed nodes were dropped — FIXED
In the eager-cascade loop, `cascadeChanges.updates` were only enqueued if the node was
neither deployed nor running; `currentNodes` was then overwritten with the new snapshot,
so the diff was swallowed. Concretely: sibling A completes and its output changes
already-deployed sibling B's props → B's handler never re-ran with the new props (and the
final safety-net couldn't see it, because the baseline had already absorbed the change).
Same for nodes whose props changed *while their handler was running*.
**Fix:** deployed nodes with changed props are re-queued; nodes updated while running are
marked dirty and re-queued on completion.

### F6. `deepEqual` blind spots in prop diffing — FIXED
`reconcile.deepEqual` treated `Date`, `RegExp`, `Map`, and `Set` as plain objects with no
enumerable keys — **any two were "equal"**, so e.g. a changed `Date` prop never triggered
an update. `NaN !== NaN` meant a `NaN` prop registered as a perpetual change. (Contrast:
`instance.ts` `shallowEqual` already handled Map/Set/Array — the two had drifted.)
**Fix:** `deepEqual` now handles NaN, Date (epoch), RegExp (source+flags), Map and Set.

### F7. Concurrent runtimes clobbered each other's flush callback — FIXED
`setOnFlushCallback` was a single global slot: constructing a second runtime silently
stole reactive flushes from the first, and disposing *any* runtime set the slot to
`null`, killing flushes for all survivors (despite `activeRuntimes` being a Set —
multi-runtime was clearly intended). **Fix:** tracking now keeps a Set of flush
callbacks (`addFlushCallback`/`removeFlushCallback`); each runtime registers its own and
removes only its own on dispose.

### F8. Cascade-born nodes had no crash checkpoint — FIXED
`startDeployment` persisted the node list once, up front. Nodes materialized mid-cascade
weren't in that list, so `updateNodeOutputs` silently no-opped for them (its
`state.nodes.find` missed) — a crash before `completeDeployment` lost their outputs and
their `applyingNodeIds` entries pointed at unknown ids. **Fix:** on cascade, the
persisted node list is synced (`StateMachine.syncNodes`, preserving status and
`applyingNodeIds`).

### F9. Empty-outputs nodes restored as "deployed" — FIXED
`restoreResourceStates` used `node.outputs ? "deployed" : "pending"`, so `outputs: {}`
counted as deployed, disagreeing with `run()`'s own `Object.keys(...).length > 0` filter.
**Fix:** aligned on non-empty outputs.

### F10. `setStore` outside a batch never ran effects — FIXED
`store.ts` `notifyProperty` marked observers STALE and called `scheduleComputation`,
but that helper only pushes onto the Updates/Effects queues **if a batch is active**.
From a plain async callback (interval, event handler outside the reactive system) the
queues are `null`, so `setStore(...)` silently did nothing observable — effects reading
the store never re-ran (found by the new store test suite). **Fix:** `notifyProperty`
now wraps observer scheduling in `runUpdates` and marks downstream memos, exactly
mirroring `createSignal`'s write path.

### F11. Root owner was captured after `await`s — always null — FIXED
`run()` read `getOwner()` only after awaiting lock/resume/state loads; by then the
synchronous `createRoot` owner context was long gone, so `rootOwner` was always `null`
and `dispose()`'s root-owner cleanup was dead code (root-level effects were never
released). Additionally, `render()` passed a zero-arg callback to `createRoot`, which
reuses the shared `UNOWNED` sentinel rather than allocating a real root owner.
**Fix:** owner is captured before the first `await`, and `render()`'s callback takes
the dispose arg so a real owner is created.

### Documented (left as-is)

- **D1. `parallelBatches` is computed but unused** — `reconcile()` computes
  `computeParallelBatches` on every diff; the executor uses its own eager scheduler
  (`getReadyNodes`). Kept because it's part of the public `ChangeSet` shape.
- **D2. `StateMachine.getResourceState` is write-only** — the runtime records resource
  states but never branches on them; they exist for observability.
- **D3. `setOutputs` calls `nodeOwnership.clear()`** — a global reset of duplicate-ID
  detection on every output write. Collision detection therefore only reliably guards the
  initial render pass. Changing this risks false positives on `For` reorder; documented
  instead of fixed.
- **D4. `unwrap()` returns a `structuredClone`**, not the raw target (differs from
  Solid). Mutating the unwrapped value does not affect the store. Covered by tests as
  the contract.
- **D5. `render()` force-overrides the root element's `key`** with `stackName`.
- **D6. Static (non-getter) props containing `undefined`** create a permanent
  placeholder — the node only materializes via the getter-props upgrade path.
- **D7. In-process mutexes don't span processes** — `AsyncMutex` serializes state writes
  within one process; cross-process safety is exactly what F1's lock wiring provides
  (when the backend implements it).

### Limitations (inherent design)

- **L1. Resources removed *between* runs can't run cleanup** — a node persisted with
  outputs whose component no longer exists on the next boot has no handler/`cleanupFn`
  (code is gone); it is dropped from state without teardown. True of any
  "cleanup lives in code" model.
- **L2. `collectInstanceNodes` snapshots `store` via `JSON.parse(JSON.stringify(...))`**
  — non-JSON-serializable store contents (functions, BigInt, cycles) throw or drop.
