# 1. Setup

Let's build a chat agent that searches Wikipedia.

## Create the project

```bash
mkdir agent && cd agent
npm init -y
npm install @creact-labs/creact openai express dotenv
npm install -D typescript @types/node @types/express
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
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

The `jsxImportSource` tells TypeScript to use CReact's JSX runtime instead of React's.

`package.json` scripts:

```json
{
  "scripts": {
    "start": "creact src/app.tsx",
    "dev": "creact --watch src/app.tsx",
    "cleanup": "rm -rf .creact-state && echo 'Cleared state'"
  }
}
```

- `dev` - Runs the app with hot reload
- `cleanup` - Clears persisted state (useful for starting fresh)

## Environment

Create `.env` with your OpenAI key:

```
OPENAI_API_KEY=sk-...
```

Get one from https://platform.openai.com/api-keys

## Project structure

```
agent/
├── src/
│   ├── providers/
│   │   ├── Provider.ts       # Executes constructs
│   │   └── FileBackend.ts    # Persists state to disk
│   ├── constructs/           # Data shapes
│   ├── components/           # JSX composition
│   │   └── App.tsx
│   └── app.tsx               # Entry point
├── public/
│   └── index.html            # Chat UI
├── .env
├── package.json
└── tsconfig.json
```

---

Next: [2. Architecture](./2-architecture.md)
