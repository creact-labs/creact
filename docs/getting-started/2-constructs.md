# 2. Constructs

A construct is a class with props and outputs. That's all.

The props say what you want. The outputs say what you got. The provider does the work in between.

Think of constructs like order forms. You fill in what you want (props), hand it to the kitchen (provider), and get back your meal (outputs).

## ChatModel

Register which model to use.

```ts
// src/constructs/ChatModel.ts
export interface ChatModelProps {
  model: string;
}

export interface ChatModelOutputs {
  id: string;
}

export class ChatModel {
  constructor(public props: ChatModelProps) {}
}
```

Props: "I want gpt-4o-mini"
Outputs: "Here's an ID you can reference"

## Memory

Store conversation history.

```ts
// src/constructs/Memory.ts
export interface MemoryProps {
  windowSize?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface MemoryOutputs {
  id: string;
  messages: Message[];
}

export class Memory {
  constructor(public props: MemoryProps) {}
}
```

Outputs include the actual messages so components can read them.

## Tool

Register a tool the model can call.

```ts
// src/constructs/Tool.ts
export interface ToolProps {
  name: string;
  description: string;
}

export interface ToolOutputs {
  id: string;
}

export class Tool {
  constructor(public props: ToolProps) {}
}
```

The model sees the name and description. It decides when to call it.

## Completion

Make one LLM call.

```ts
// src/constructs/Completion.ts
export interface CompletionProps {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  toolIds: string[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface CompletionOutputs {
  content: string | null;
  toolCalls: ToolCall[];
}

export class Completion {
  constructor(public props: CompletionProps) {}
}
```

This is the core. You give it messages and tools. It returns either content (a response) or toolCalls (the model wants to use a tool).

## ToolExec

Execute a tool call.

```ts
// src/constructs/ToolExec.ts
export interface ToolExecProps {
  callId: string;
  args: Record<string, any>;
}

export interface ToolExecOutputs {
  result: string;
}

export class ToolExec {
  constructor(public props: ToolExecProps) {}
}
```

The provider knows how to run the actual tool (Wikipedia search in our case).

## AddMessage

Save a message to memory.

```ts
// src/constructs/AddMessage.ts
export interface AddMessageProps {
  memoryId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface AddMessageOutputs {
  added: boolean;
}

export class AddMessage {
  constructor(public props: AddMessageProps) {}
}
```

## HttpServer

Run a local HTTP server.

```ts
// src/constructs/HttpServer.ts
export interface HttpServerProps {
  port: number;
  staticDir?: string;
}

export interface HttpServerOutputs {
  id: string;
  url: string;
}

export class HttpServer {
  constructor(public props: HttpServerProps) {}
}
```

The provider starts Express. If `staticDir` is set, it serves files from there.

## ChatHandler

Handle incoming chat messages.

```ts
// src/constructs/ChatHandler.ts
export interface ChatHandlerProps {
  serverId: string;
  path: string;
}

export interface PendingMessage {
  id: string;
  content: string;
}

export interface ChatHandlerOutputs {
  id: string;
  pending: PendingMessage | null;
}

export class ChatHandler {
  constructor(public props: ChatHandlerProps) {}
}
```

When a message arrives via HTTP, it shows up in `pending`. The component tree sees it and renders the Agent.

## ChatResponse

Send a response back to the client.

```ts
// src/constructs/ChatResponse.ts
export interface ChatResponseProps {
  handlerId: string;
  messageId: string;
  content: string;
}

export interface ChatResponseOutputs {
  sent: boolean;
}

export class ChatResponse {
  constructor(public props: ChatResponseProps) {}
}
```

This completes the HTTP request. The browser receives the agent's response.

---

Next: [3. Provider](./3-provider.md)
