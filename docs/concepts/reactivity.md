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
