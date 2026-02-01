# Tutorial: AI Agent with Wikipedia

We're building an AI agent you can chat with in the browser. It searches Wikipedia to answer your questions.

**What you'll learn:**

1. **Constructs** - Data shapes. Like TypeScript interfaces that the provider knows how to handle.
2. **Provider** - The engine. Takes constructs and does the actual work (API calls, HTTP server, etc).
3. **Components** - Composition. JSX that wires constructs together.

## Setup

```bash
mkdir agent && cd agent
npm init -y
npm install @creact-labs/creact openai express dotenv
npm install -D typescript @types/node @types/express
```

You need one API key:

```
OPENAI_API_KEY=sk-...
```

Get it from https://platform.openai.com/api-keys

## Project structure

```
agent/
├── src/
│   ├── constructs/      # What things ARE
│   ├── components/      # How things COMPOSE
│   ├── providers/       # How things RUN
│   └── app.tsx          # Entry point
├── public/
│   └── index.html       # Chat UI
├── .env
└── tsconfig.json
```

Three folders, three concepts. Constructs define shape. Components define structure. Provider defines behavior.

The `public/` folder holds the chat page. The provider serves it.

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

---

Next: [2. Constructs](./2-constructs.md)
