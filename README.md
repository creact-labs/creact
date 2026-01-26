# CReact v2

Universal reactive runtime

## Quick Start

```bash
cd new

# Install dependencies
npm install

# Run tests
npm test

# Run tests once
npm run test:run

# Type check
npm run typecheck

# Build
npm run build
```

## Primitives

| Primitive | Purpose |
|-----------|---------|
| `useInstance(construct, props)` | Bind to provider, get reactive outputs |
| `createStore(initial)` | Persistent storage (non-reactive) |
| `createContext(default?)` | Create context |
| `useContext(ctx)` | Read context value |
| `createEffect(fn)` | Run when tracked outputs change |

## Example

```typescript
import { useInstance, createStore, createContext, useContext, createEffect, run, createMockProvider, createElement } from 'creact';

class Database {}
class ApiServer {}

const ConfigContext = createContext({ env: 'dev' });

function App() {
  const [config, setConfig] = createStore({ retries: 3 });
  const db = useInstance<{ url: string; status: string }>(Database, { name: 'main' });

  createEffect(() => {
    if (db.status() === 'ready') {
      console.log('Database ready at:', db.url());
    }
  });

  return createElement(
    ConfigContext.Provider,
    { value: config },
    db.status() === 'ready' && createElement(Services, { db })
  );
}

function Services({ db }) {
  const config = useContext(ConfigContext);
  const api = useInstance<{ endpoint: string }>(ApiServer, {
    database: db.url(),
    retries: config.retries
  });

  return api.endpoint() && createElement(Client, { url: api.endpoint() });
}

// Run with a provider
const provider = createMockProvider({
  apply: (node) => {
    if (node.constructType === 'Database') {
      return { url: 'postgres://localhost', status: 'ready' };
    }
    if (node.constructType === 'ApiServer') {
      return { endpoint: 'http://localhost:3000' };
    }
    return {};
  }
});

run(createElement(App, {}), provider);
```

#