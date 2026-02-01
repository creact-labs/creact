# Components

Components compose constructs using JSX.

## Requirement

**One `useInstance` per component at max.**

```tsx
// ✅ Good: One resource per component
function Database({ name, children }) {
  const db = useInstance(DynamoDBTable, { name });
  return children(db);
}

function Cache({ connectionString, children }) {
  const cache = useInstance(Redis, { connectionString });
  return children(cache);
}

// Compose by nesting
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

## Render Props

Components use render props to pass outputs to children:

```tsx
function Database({ name, children }) {
  const db = useInstance(DynamoDBTable, { name });
  return children(db);  // children is a function
}

<Database name="main">
  {(db) => (
    // db.url(), db.name() are available here
    <Cache connectionString={db.url()} />
  )}
</Database>
```

## Dynamic Lists

Use `.map()` with keys:

```tsx
<DynamoDBTable name="environments">
  {(table) => (
    {(table.items() || []).map((env) => (
      <Site key={env.name} config={env} />
    ))}
  )}
</DynamoDBTable>
```

## Conditional Resources

```tsx
{enableMonitoring && (
  <Monitoring apiUrl={api.url()} />
)}
```

## Leaf Components

Components without children return `null`:

```tsx
function Site({ name, color }) {
  useInstance(SiteConstruct, { name, color });
  return null;
}
```

## Undefined Dependencies

When a prop is `undefined`, the construct is skipped until the dependency resolves. This is automatic.
