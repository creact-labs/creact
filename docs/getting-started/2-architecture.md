# 2. Architecture

## Constructs

A construct is a class with `props` (input) and outputs (result).

## Components

JSX that wires constructs together. Components call `useInstance()` to create construct instances and receive outputs through render props.

## Provider

The engine that executes constructs. CReact renders your component tree, collects construct instances, and calls `provider.materialize()`.

## Backend

Persists state. When you restart, CReact loads previous state and hydrates construct outputs.

## How they connect

```
Components (JSX)
     │
     │ useInstance() creates
     ▼
Constructs (data shapes)
     │
     │ materialize() executes
     ▼
Provider (the engine)
     │
     │ saves/loads state
     ▼
Backend (persistence)
```

---

Next: [3. Constructs](./3-constructs.md)
