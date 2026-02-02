# 1. Setup

> **Full example**: [creact-agentic-chatbot-example](https://github.com/creact-labs/creact-agentic-chatbot-example)

Build an agentic chatbot with web search and browsing tools.

## Create the project

```bash
mkdir chatbot && cd chatbot
npm init -y
npm install @creact-labs/creact openai express playwright dotenv
npm install -D typescript @types/node @types/express
npx playwright install chromium
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@creact-labs/creact",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## package.json scripts

```json
{
  "type": "module",
  "scripts": {
    "start": "creact app.tsx",
    "dev": "creact --watch app.tsx",
    "cleanup": "rm -rf .creact-state"
  }
}
```

## .env

```
OPENAI_API_KEY=sk-...
```

## Project structure

```
chatbot/
├── app.tsx                    # Entry point
├── src/
│   ├── components/
│   │   ├── App.tsx
│   │   ├── server/
│   │   │   ├── HttpServer.construct.ts
│   │   │   └── Server.tsx
│   │   ├── chat/
│   │   │   ├── ChatHandler.construct.ts
│   │   │   ├── ChatModel.construct.ts
│   │   │   ├── ChatResponse.construct.ts
│   │   │   ├── Chat.tsx
│   │   │   ├── Model.tsx
│   │   │   └── SendResponse.tsx
│   │   ├── memory/
│   │   │   ├── Memory.construct.ts
│   │   │   ├── AddMessage.construct.ts
│   │   │   ├── Memory.tsx
│   │   │   └── SaveMessages.tsx
│   │   ├── completion/
│   │   │   ├── Completion.construct.ts
│   │   │   └── Completion.tsx
│   │   ├── message/
│   │   │   ├── Message.construct.ts
│   │   │   └── Message.tsx
│   │   └── tools/
│   │       ├── Tool.tsx
│   │       ├── ToolContext.tsx
│   │       ├── ToolProvider.tsx
│   │       ├── DuckDuckGo.tsx
│   │       └── Browser.tsx
│   └── providers/
│       ├── Provider.ts
│       ├── FileBackend.ts
│       └── handlers/
│           ├── http.ts
│           ├── chat.ts
│           ├── completion.ts
│           └── memory.ts
├── public/
│   └── index.html
├── .env
├── package.json
└── tsconfig.json
```

Constructs are colocated with their components.

---

Next: [2. Architecture](./2-architecture.md)
