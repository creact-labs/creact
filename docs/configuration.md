# CReact Configuration

CReact uses a React-style singleton API for configuration. All configuration is done in your entry file using the `CReact` singleton.

## Quick Start

Create an entry file (e.g., `index.tsx`) with your infrastructure and configuration:

```typescript
/**
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '@escambo/creact';
import { DummyCloudProvider } from '@escambo/creact/providers';
import { DummyBackendProvider } from '@escambo/creact/providers';

// Configure providers (singleton pattern, like ReactDOM)
CReact.cloudProvider = new DummyCloudProvider();
CReact.backendProvider = new DummyBackendProvider();

// Optional: Configure retry policies
CReact.retryPolicy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  timeout: 300000,
};

// Optional: Configure async timeout
CReact.asyncTimeout = 600000; // 10 minutes

// Define your infrastructure
function MyApp() {
  return (
    <>
      <AwsLambda key="api" handler="index.handler" />
      <DockerContainer key="db" image="postgres:14" />
    </>
  );
}

// Render to CloudDOM (like ReactDOM.render)
export default CReact.renderCloudDOM(<MyApp />, 'my-stack');
```

Then use the CLI:

```bash
creact build --entry index.tsx
creact deploy --entry index.tsx
```

## Configuration Options

### Required Configuration

#### `CReact.cloudProvider`

The cloud provider handles resource materialization (creating, updating, deleting infrastructure).

```typescript
import { AwsCloudProvider } from '@escambo/creact/providers';

CReact.cloudProvider = new AwsCloudProvider({
  region: 'us-east-1',
  profile: 'default',
});
```

Available providers:
- `DummyCloudProvider` - Mock provider for testing
- `AwsCloudProvider` - AWS resources (coming soon)
- `DockerCloudProvider` - Docker containers (coming soon)
- `ProviderRouter` - Multi-provider support (coming soon)

#### `CReact.backendProvider`

The backend provider handles state management, locking, and secrets.

```typescript
import { S3BackendProvider } from '@escambo/creact/providers';

CReact.backendProvider = new S3BackendProvider({
  bucket: 'my-terraform-state',
  region: 'us-east-1',
});
```

Available backends:
- `DummyBackendProvider` - In-memory backend for testing
- `FileBackendProvider` - Local file storage (coming soon)
- `S3BackendProvider` - AWS S3 storage (coming soon)
- `PostgresBackendProvider` - PostgreSQL storage (coming soon)

### Optional Configuration

#### `CReact.retryPolicy`

Global retry policy for transient errors:

```typescript
CReact.retryPolicy = {
  maxRetries: 3,              // Maximum retry attempts
  initialDelay: 1000,         // Initial backoff delay (ms)
  maxDelay: 30000,            // Maximum backoff delay (ms)
  backoffMultiplier: 2,       // Exponential backoff multiplier
  timeout: 300000,            // Operation timeout (ms)
};
```

#### `CReact.asyncTimeout`

Global timeout for async operations:

```typescript
CReact.asyncTimeout = 600000; // 10 minutes
```

#### `CReact.migrationMap`

Resource ID remapping for refactoring (avoids destroy/recreate):

```typescript
CReact.migrationMap = {
  'old-database-id': 'new-database-id',
  'old-api-id': 'new-api-id',
};
```

## Multi-Environment Setup

Use environment variables to configure different environments:

```typescript
// index.tsx
import { CReact } from '@escambo/creact';
import { AwsCloudProvider, S3BackendProvider } from '@escambo/creact/providers';

// Environment-specific configuration
const isProd = process.env.NODE_ENV === 'production';

CReact.cloudProvider = new AwsCloudProvider({
  region: isProd ? 'us-east-1' : 'us-west-2',
  profile: isProd ? 'production' : 'development',
});

CReact.backendProvider = new S3BackendProvider({
  bucket: isProd ? 'prod-terraform-state' : 'dev-terraform-state',
});

// Stack name from environment
const stackName = process.env.STACK_NAME || 'my-app-dev';

function MyApp() {
  return <>{/* Your infrastructure */}</>;
}

export default CReact.renderCloudDOM(<MyApp />, stackName);
```

Then deploy:

```bash
# Development
creact deploy --entry index.tsx

# Production
NODE_ENV=production STACK_NAME=my-app-prod creact deploy --entry index.tsx
```

## CLI Flags

All CLI commands require the `--entry` flag:

```bash
# Build CloudDOM
creact build --entry index.tsx

# Show diff
creact plan --entry index.tsx

# Deploy
creact deploy --entry index.tsx

# Override stack name
creact deploy --entry index.tsx --stack production

# Verbose output
creact build --entry index.tsx --verbose

# JSON output (for CI/CD)
creact plan --entry index.tsx --json
```

## Error Handling

### Missing Providers

If you forget to set providers, you'll get a clear error:

```
Configuration Error: CReact.cloudProvider must be set in entry file.

Example:
  import { CReact } from '@escambo/creact';
  import { AwsCloudProvider } from '@escambo/creact/providers';

  CReact.cloudProvider = new AwsCloudProvider();
  CReact.backendProvider = new S3BackendProvider();
```

### Entry File Not Found

```bash
$ creact build --entry missing.tsx

Configuration Error: Entry file not found: missing.tsx
```

### TypeScript Support

TypeScript entry files require `tsx` to be installed:

```bash
npm install tsx
```

If not installed, you'll get:

```
Configuration Error: TypeScript entry files require "tsx" to be installed.

Install tsx:
  npm install tsx
```

## Best Practices

1. **Single Source of Truth**: Keep all configuration in your entry file
2. **Environment Variables**: Use env vars for environment-specific config
3. **Type Safety**: Use TypeScript for full type checking
4. **Secrets**: Never hardcode secrets - use environment variables or the secrets manager
5. **Stack Names**: Use descriptive stack names (e.g., `my-app-prod`, `my-app-staging`)

## Migration from Config Files

If you're migrating from the old `creact.config.ts` approach:

**Old (deprecated):**
```typescript
// creact.config.ts
export default {
  cloudProvider: new AwsCloudProvider(),
  backendProvider: new S3BackendProvider(),
  entry: './index.tsx',
};

// index.tsx
export default <MyApp />;
```

**New:**
```typescript
// index.tsx
import { CReact } from '@escambo/creact';

CReact.cloudProvider = new AwsCloudProvider();
CReact.backendProvider = new S3BackendProvider();

export default CReact.renderCloudDOM(<MyApp />, 'my-stack');
```

Then delete `creact.config.ts` and update CLI commands to use `--entry` instead of `--config`.
