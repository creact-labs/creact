# 3. Constructs

A construct is a class with props (input) and outputs (result).

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

---

Next: [4. Components](./4-components.md)
