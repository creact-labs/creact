# Tutorial: AI Agent with Wikipedia

Build a chat agent that searches Wikipedia.

## What you'll learn

CReact has four core pieces:

1. **Provider** - The engine. Executes constructs and handles external events.
2. **Backend** - State persistence. Saves deployment state for crash recovery.
3. **Constructs** - Data shapes. What you want (props) and what you get (outputs).
4. **Components** - Composition. JSX that wires constructs together.

## Setup

```bash
mkdir agent && cd agent
npm init -y
npm install @creact-labs/creact openai express dotenv
npm install -D typescript @types/node @types/express
```

Create `.env` with your OpenAI key:

```
OPENAI_API_KEY=sk-...
```

Get it from https://platform.openai.com/api-keys

## Project structure

```
agent/
├── src/
│   ├── providers/
│   │   ├── Provider.ts       # Executes constructs
│   │   └── InMemoryBackend.ts # Persists state
│   ├── constructs/           # Data shapes
│   ├── components/           # JSX composition
│   └── app.tsx               # Entry point
├── public/
│   └── index.html            # Chat UI
├── .env
├── package.json
└── tsconfig.json
```

## Configuration

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "jsxImportSource": "@creact-labs/creact",
    "strict": true,
    "esModuleInterop": true
  }
}
```

`package.json` scripts:

```json
{
  "scripts": {
    "start": "creact src/app.tsx",
    "dev": "creact --watch src/app.tsx"
  }
}
```

---

Next: [2. Provider & Backend](./2-provider.md)
