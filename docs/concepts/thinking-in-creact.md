# Thinking in CReact

## Process

### 1. Identify resources
What do you need?
- Database
- Cache
- API

### 2. Define shapes
Props (input) and outputs (result) for each:

```
Database:    { name } → { url }
Cache:       { connectionString } → { endpoint }
API:         { cacheEndpoint } → { url }
```

### 3. Map dependencies
What depends on what?

```
Database → Cache → API
```

### 4. Write JSX
Dependencies flow through render props:

```tsx
<Database name="main">
  {(db) => (
    <Cache connectionString={db.url()}>
      {(cache) => (
        <API cacheEndpoint={cache.endpoint()} />
      )}
    </Cache>
  )}
</Database>
```

## Rules
- One resource per component
- Dependencies flow down via render props
- Reactivity is automatic
