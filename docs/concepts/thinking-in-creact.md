# Thinking in CReact

CReact has a mental model for breaking down problems into declarative, reactive systems.

## The Process

### 1. Break it into pieces
What resources or actions do you need?

- A database
- A cache that connects to the database
- An API that uses the cache

### 2. Define the shapes
For each piece, what goes in (props) and what comes out (outputs)?

```
Database:    { name } → { url }
Cache:       { connectionString } → { endpoint }  
API:         { cacheEndpoint } → { url }
```

### 3. Draw the dependencies
What depends on what?

```
Database → Cache → API
```

### 4. Write the tree
Translate dependencies into JSX. Dependencies flow down through render props.

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

### 5. Let it react
CReact handles the rest. When outputs change, dependent components re-render automatically.

## Key Rules

**One resource per component.** Each component with `useInstance` represents one resource.

**Dependencies flow down.** Parent outputs become child props via render props.

**Reactivity is automatic.** No manual refresh needed.
