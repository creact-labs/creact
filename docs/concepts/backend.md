# Backend

The backend persists deployment state. It enables crash recovery, incremental deploys, and audit logging.

## What is a Backend?

A backend stores the state of your deployments. Without it, CReact would forget everything on restart.

```tsx
CReact.backend = new FileBackend({ directory: '.state' });
```

## Why You Need It

### Crash Recovery

If CReact crashes mid-deploy, the backend knows which resources were already created. On restart, it picks up where it left off.

```
Deploy starts → Resource A created → Resource B created → CRASH
                                                            ↓
Restart → Backend says A and B exist → Continue from C
```

### Incremental Deploys

The backend tracks what's deployed. On the next run, CReact only changes what's different.

```tsx
// First deploy: creates A, B, C
await renderCloudDOM(<App />, 'my-stack');

// Change props on B
// Second deploy: only updates B (A and C unchanged)
await renderCloudDOM(<App />, 'my-stack');
```

### State Hydration

`createStore` values are persisted and restored across restarts.

```tsx
function Counter() {
  const [count, setCount] = createStore('counter', 0);
  // After restart, count is restored to previous value
}
```

## The Backend Interface

```tsx
interface Backend {
  // Get current state
  getState(stackName: string): Promise<DeploymentState | null>;
  
  // Save state
  saveState(stackName: string, state: DeploymentState): Promise<void>;
  
  // Optional: Lock for concurrent deploy protection
  acquireLock?(stackName: string, holder: string, ttlSeconds: number): Promise<boolean>;
  releaseLock?(stackName: string): Promise<void>;
  
  // Optional: Audit trail
  appendAuditLog?(stackName: string, entry: AuditLogEntry): Promise<void>;
  getAuditLog?(stackName: string, limit?: number): Promise<AuditLogEntry[]>;
}
```

## Example Implementations

- **FileBackend**: Local JSON file (development)
- **S3Backend**: AWS S3 (production)
- **DynamoDBBackend**: AWS DynamoDB (production)
- **PostgresBackend**: PostgreSQL database

## Next Steps

- [Providers](./providers.md) - Learn how providers execute constructs
- [Reactivity](./reactivity.md) - Understand how changes propagate
