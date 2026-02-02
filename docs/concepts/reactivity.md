# Reactivity

## The Loop

```
Declare → Apply → Event → Re-render → Apply
```

1. JSX tree describes desired state
2. Provider creates resources, sets outputs
3. External change detected (webhook, DB update, etc.)
4. Components re-render with new outputs
5. New resources created, old ones removed

## Outputs Are Reactive

Reading an output subscribes to changes:

```tsx
<Database name="environments">
  {(table) => (
    // When table.items() changes, this re-renders
    {(table.items() || []).map((env) => (
      <Site key={env.name} config={env} />
    ))}
  )}
</Database>
```

## Event-Driven

Providers emit events when things change:

```tsx
// Provider detects change
provider.emit('outputsChanged', {
  resourceName: 'environments',
  outputs: { items: newItems },
});

// CReact automatically re-renders dependent components
```

## createSignal

Create component-owned reactive state:

```tsx
import { createSignal } from '@creact-labs/creact';

const [count, setCount] = createSignal(0);

// Read the value (tracks dependencies)
console.log(count()); // 0

// Update the value (triggers dependents)
setCount(5);
```

Useful for async operations like data fetching:

```tsx
function DataFetcher({ url, children }) {
  const [data, setData] = createSignal(null);

  createEffect(async () => {
    const response = await fetch(url);
    setData(await response.json());
  });

  return data() ? children(data()) : null;
}
```

## createEffect

Run side effects when dependencies change:

```tsx
createEffect(() => {
  console.log(`Count: ${table.items()?.length}`);
});
```

Return a cleanup function:

```tsx
createEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();
});
```
