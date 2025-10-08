# CReact Hooks: Non-Reactive by Design

## Critical Understanding

**CReact hooks are NOT reactive like React hooks.** This is the most important concept for developers to understand.

## Hook Behavior Patterns

### useState - Declarative Output, Not Reactive State

```tsx
// ❌ WRONG Mental Model (React thinking)
function MyComponent() {
  const [count, setCount] = useState(0);
  
  // This does NOT cause re-render in CReact
  setCount(count + 1);
  
  // count is still 0 here - setState doesn't affect current render
  console.log(count); // 0
  
  return <></>;
}

// ✅ CORRECT Mental Model (CReact thinking)
function MyComponent() {
  const [dbUrl, setDbUrl] = useState<string>(); // Declares persistent output
  
  const db = useInstance(Database, { name: 'my-db' });
  
  // Updates persistent output for next deployment cycle
  setDbUrl(db.connectionUrl);
  
  // dbUrl is still '' in this render - setState updates persisted state
  console.log(dbUrl); // ''
  
  return <></>;
}
```

### useContext - Static During Render

```tsx
// ❌ WRONG Mental Model (React thinking)
function ChildComponent() {
  const config = useContext(ConfigContext);
  
  // Expecting this to update when Provider value changes
  // In React, this would cause re-render when context changes
  return <SomeResource config={config} />;
}

// ✅ CORRECT Mental Model (CReact thinking)
function ChildComponent() {
  const config = useContext(ConfigContext); // Static for this render
  
  // config is resolved once during tree traversal
  // No subscription, no re-render on context changes
  const resource = useInstance(SomeResource, { config });
  
  return <></>;
}
```

## Why This Design?

### Infrastructure vs UI Fundamental Differences

| Aspect | UI (React) | Infrastructure (CReact) |
|--------|------------|-------------------------|
| **Change Frequency** | Milliseconds (user interactions) | Minutes (deployments) |
| **Change Cost** | Free (DOM updates) | Expensive (cloud resources) |
| **State Persistence** | Session-based (memory) | Deployment-based (persistent) |
| **Error Recovery** | Refresh page | Rollback deployment |

### Infrastructure-Specific Requirements

1. **Deploy Cycles, Not Render Cycles**
   - Infrastructure changes happen in deliberate deployment cycles
   - Not continuous reactive updates like UI

2. **Resource Creation Is Expensive**
   - Creating cloud resources takes time and costs money
   - Reactive updates could cause expensive resource churn

3. **State Must Persist Across Deployments**
   - Infrastructure state survives process restarts
   - Not just in-memory like UI state

4. **Changes Should Be Deliberate**
   - Infrastructure changes should be explicit and controlled
   - Not automatic reactions to state changes

## Implementation Guidelines

### When Writing CReact Components

```tsx
function InfrastructureStack() {
  // ✅ Use useState for persistent outputs
  const [apiUrl, setApiUrl] = useState<string>();
  const [dbConnectionString, setDbConnectionString] = useState<string>();
  
  // ✅ Use useContext for configuration (static during render)
  const { region, environment } = useContext(ConfigContext);
  
  // ✅ Use useInstance for resources
  const api = useInstance(ApiGateway, { region });
  const db = useInstance(Database, { region, environment });
  
  // ✅ Update outputs (takes effect next deployment)
  setApiUrl(api.url);
  setDbConnectionString(db.connectionString);
  
  // ✅ Return Fragment (no JSX rendering)
  return <></>;
}
```

### When Testing CReact Components

```tsx
it('should update persistent state without re-render', () => {
  function TestComponent() {
    const [value, setValue] = useState();
    setValue('updated'); // Updates persistent state
    return <></>;
  }

  const fiber = renderer.render(<TestComponent />);
  
  // ✅ Check persistent state in fiber.hooks
  expect(fiber.hooks[0]).toBe('updated');
  
  // ❌ Don't expect component to re-execute
  // Component only runs once per render cycle
});
```

## Common Mistakes to Avoid

### ❌ Expecting Reactive Updates

```tsx
// This won't work as expected
function BadExample() {
  const [count, setCount] = useState(0);
  
  setCount(1);
  setCount(count + 1); // count is still 0, so this sets to 1, not 2
  
  return <></>;
}
```

### ✅ Correct Pattern

```tsx
// Use updater function for sequential updates
function GoodExample() {
  const [count, setCount] = useState(0);
  
  setCount(1);
  setCount(prev => prev + 1); // Uses previous value correctly
  
  return <></>;
}
```

### ❌ Expecting Context Reactivity

```tsx
// This won't cause re-renders when context changes
function BadExample() {
  const config = useContext(ConfigContext);
  
  // Expecting this to update automatically - it won't
  return <Resource config={config} />;
}
```

### ✅ Correct Pattern

```tsx
// Context is static for each render cycle
function GoodExample() {
  const config = useContext(ConfigContext); // Static during this render
  
  const resource = useInstance(Resource, { 
    name: 'my-resource',
    config: config // Uses static value
  });
  
  return <></>;
}
```

## Documentation Standards

When documenting CReact components:

1. **Always mention non-reactive nature** in hook documentation
2. **Explain when state changes take effect** (next deployment cycle)
3. **Provide examples showing correct mental model**
4. **Highlight differences from React** where relevant
5. **Use "declarative output" terminology** instead of "reactive state"

## Error Messages

Hook error messages should be clear about the non-reactive nature:

```typescript
// ✅ Good error message
"useState must be called during component rendering. " +
"Note: CReact useState is for declarative outputs, not reactive state. " +
"State changes take effect in the next deployment cycle."

// ❌ Confusing error message  
"useState must be called during component rendering."
```

This steering document ensures all CReact development maintains consistency with the non-reactive design philosophy.