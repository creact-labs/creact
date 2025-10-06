# CReact Configuration

CReact uses a `creact.config.ts` (or `.js`) file to configure the runtime behavior, providers, and deployment settings.

## Configuration File

Create a `creact.config.ts` file in your project root:

```typescript
import { DummyCloudProvider } from '@escambo/creact/providers';
import { DummyBackendProvider } from '@escambo/creact/providers';
import type { CReactUserConfig } from '@escambo/creact/cli';

const config: CReactUserConfig = {
  // Stack name for state isolation
  stackName: 'default',

  // Cloud provider for resource materialization
  cloudProvider: new DummyCloudProvider(),

  // Backend provider for state management
  backendProvider: new DummyBackendProvider(),

  // Entry point for infrastructure code
  entry: './index.ts',

  // Global retry policy
  retryPolicy: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    timeout: 300000,
  },

  // Provider-specific retry policies
  providerRetryPolicies: {
    terraform: {
      maxRetries: 5,
      timeout: 600000,
    },
  },

  // Global async timeout
  asyncTimeout: 300000,

  // Migration map for refactoring
  migrationMap: {
    'old-resource-id': 'new-resource-id',
  },

  // Logging options
  verbose: false,
  debug: false,
};

export default config;
```

## Configuration Options

### Required Fields

#### `cloudProvider`
- **Type**: `ICloudProvider`
- **Description**: Provider for materializing cloud resources
- **Examples**: `DummyCloudProvider`, `TerraformCloudProvider`, `AwsCloudProvider`

#### `backendProvider`
- **Type**: `IBackendProvider`
- **Description**: Provider for state management and persistence
- **Examples**: `DummyBackendProvider`, `SqliteBackendProvider`, `S3BackendProvider`

### Optional Fields

#### `stackName`
- **Type**: `string`
- **Default**: `'default'`
- **Description**: Stack name for state isolation. Different stacks maintain separate state (e.g., dev, staging, prod)

#### `entry`
- **Type**: `string`
- **Default**: `'./index.ts'`
- **Description**: Entry point for infrastructure code, relative to config file

#### `retryPolicy`
- **Type**: `RetryPolicy`
- **Description**: Global retry policy for all providers
- **Fields**:
  - `maxRetries` (default: 3): Maximum number of retry attempts
  - `initialDelay` (default: 1000): Initial backoff delay in milliseconds
  - `maxDelay` (default: 30000): Maximum backoff delay in milliseconds
  - `backoffMultiplier` (default: 2): Backoff multiplier for exponential backoff
  - `timeout` (default: 300000): Timeout for each operation in milliseconds

#### `providerRetryPolicies`
- **Type**: `Record<string, RetryPolicy>`
- **Description**: Provider-specific retry policy overrides
- **Example**:
  ```typescript
  providerRetryPolicies: {
    terraform: {
      maxRetries: 5,
      timeout: 600000,
    },
  }
  ```

#### `asyncTimeout`
- **Type**: `number`
- **Default**: `300000` (5 minutes)
- **Description**: Global async timeout in milliseconds

#### `migrationMap`
- **Type**: `Record<string, string>`
- **Description**: Maps old resource IDs to new resource IDs for refactoring without destroying resources

#### `verbose`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable verbose logging

#### `debug`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable debug mode with internal state information

## CLI Usage

### Default Configuration

By default, CReact looks for `creact.config.ts` (or `.js`, `.mjs`) in the current directory:

```bash
creact build
creact deploy
```

### Custom Configuration Path

Use the `--config` flag to specify a custom configuration file:

```bash
creact build --config ./config/production.config.ts
creact deploy --config ./config/staging.config.ts
```

### CLI Flag Overrides

CLI flags override configuration file settings:

```bash
# Override verbose setting
creact build --verbose

# Override debug setting
creact deploy --debug

# Combine multiple flags
creact plan --config ./custom.config.ts --verbose --json
```

## Configuration File Locations

CReact searches for configuration files in the following order:

1. Explicit path via `--config` flag
2. `./creact.config.ts` in current directory
3. `./creact.config.js` in current directory
4. `./creact.config.mjs` in current directory

## Multi-Environment Setup

Use different configuration files for different environments:

```
project/
├── creact.config.ts          # Default (development)
├── creact.config.prod.ts     # Production
├── creact.config.staging.ts  # Staging
└── index.ts                  # Infrastructure code
```

Deploy to different environments:

```bash
# Development
creact deploy

# Staging
creact deploy --config ./creact.config.staging.ts

# Production
creact deploy --config ./creact.config.prod.ts
```

## TypeScript Support

CReact fully supports TypeScript configuration files with type checking:

```typescript
import type { CReactUserConfig } from '@escambo/creact/cli';

const config: CReactUserConfig = {
  // TypeScript will validate all fields
  cloudProvider: new MyCloudProvider(),
  backendProvider: new MyBackendProvider(),
};

export default config;
```

## Error Handling

If the configuration file is missing or invalid, CReact will:

1. Display a clear error message
2. Show the cause of the error (if available)
3. Suggest creating a configuration file
4. Exit with code 1

Example error output:

```
Configuration Error: Failed to load configuration file: Cannot find module './providers'
Caused by: Cannot find module './providers'

Create a creact.config.ts file in your project root.
See examples/creact.config.example.ts for reference.
```

## Best Practices

1. **Version Control**: Commit `creact.config.ts` to version control
2. **Secrets**: Don't store secrets in config files. Use environment variables or the secrets manager
3. **Environment-Specific**: Use separate config files for different environments
4. **Type Safety**: Use TypeScript for configuration files to catch errors early
5. **Documentation**: Document custom providers and their configuration options

## Example Configurations

### Local Development

```typescript
import { DummyCloudProvider } from '@escambo/creact/providers';
import { DummyBackendProvider } from '@escambo/creact/providers';

export default {
  stackName: 'dev',
  cloudProvider: new DummyCloudProvider(),
  backendProvider: new DummyBackendProvider(),
  verbose: true,
  debug: true,
};
```

### Production

```typescript
import { AwsCloudProvider } from '@escambo/creact/providers';
import { S3BackendProvider } from '@escambo/creact/providers';

export default {
  stackName: 'prod',
  cloudProvider: new AwsCloudProvider({
    region: 'us-east-1',
  }),
  backendProvider: new S3BackendProvider({
    bucket: 'my-terraform-state',
    key: 'prod/terraform.tfstate',
  }),
  retryPolicy: {
    maxRetries: 5,
    timeout: 600000, // 10 minutes
  },
  verbose: false,
  debug: false,
};
```

### Multi-Provider

```typescript
import { ProviderRouter } from '@escambo/creact/core';
import { TerraformCloudProvider } from '@escambo/creact/adapters';
import { DockerCloudProvider } from '@escambo/creact/providers';
import { PostgresBackendProvider } from '@escambo/creact/providers';

const router = new ProviderRouter();
router.register(/^terraform:/, new TerraformCloudProvider());
router.register(/^docker:/, new DockerCloudProvider());

export default {
  stackName: 'hybrid',
  cloudProvider: router,
  backendProvider: new PostgresBackendProvider({
    connectionString: process.env.DATABASE_URL,
  }),
  providerRetryPolicies: {
    terraform: {
      maxRetries: 5,
      timeout: 600000,
    },
    docker: {
      maxRetries: 3,
      timeout: 120000,
    },
  },
};
```
