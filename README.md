# CReact

**Declarative universal reactive runtime.**

## Install

```bash
npm install creact
```

## Quick Example

```tsx
// tsconfig.json: "jsxImportSource": "creact"

import { CReact, renderCloudDOM, useInstance } from 'creact';

// Define constructs
class ChatModel {
  constructor(public props: { model: string }) {}
}

class Memory {
  constructor(public props: {}) {}
}

// Define components
function Model({ model, children }) {
  const out = useInstance(ChatModel, { model });
  return children(out);
}

function Mem({ children }) {
  const out = useInstance(Memory, {});
  return children(out);
}

function App({ prompt }) {
  return (
    <Model model="gpt-4">
      {(model) => (
        <Mem>
          {(memory) => (
            <Agent
              prompt={prompt}
              modelId={model.id()}
              messages={memory.messages()}
            />
          )}
        </Mem>
      )}
    </Model>
  );
}

// Run
CReact.provider = new AgentProvider();
CReact.backend = new FileBackend({ directory: '.state' });

await renderCloudDOM(<App prompt="Hello" />, 'agent');
```

## The Four Pillars

**Declarative** — Describe what you want, not how to get it.

**Universal** — Works for AI agents, cloud infrastructure, APIs, anything.

**Reactive** — Automatically responds when things change.

**Runtime** — Keeps running continuously, handles events, recovers from crashes.

## Documentation

### Getting Started

- [Tutorial: Build an AI Agent](./docs/getting-started/1-setup.md)

### Concepts

- [Thinking in CReact](./docs/concepts/thinking-in-creact.md) — The mental model
- [Constructs](./docs/concepts/constructs.md) — Your building blocks
- [Components](./docs/concepts/components.md) — Composing with JSX
- [Reactivity](./docs/concepts/reactivity.md) — When things change
- [Providers](./docs/concepts/providers.md) — Connecting to the real world

## License

Apache-2.0
