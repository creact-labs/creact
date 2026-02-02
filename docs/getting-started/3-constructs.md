# 3. Constructs

## ChatModel

```ts
// src/constructs/ChatModel.ts
export interface ChatModelProps {
  model: string;
}

export interface ChatModelOutputs {
  id: string;
  model: string;
}

export class ChatModel {
  constructor(public props: ChatModelProps) {}
}
```

## Memory

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

Messages get hydrated from the backend on restart.

## Tool

```ts
// src/constructs/Tool.ts
export interface ToolProps {
  name: string;
  description: string;
}

export interface ToolOutputs {
  id: string;
  name: string;
  description: string;
}

export class Tool {
  constructor(public props: ToolProps) {}
}
```

Outputs include name/description so components can build tool configs.

## Completion

```ts
// src/constructs/Completion.ts
export interface ToolConfig {
  name: string;
  description: string;
}

export interface CompletionProps {
  model: string;
  messages: Array<{ role: string; content: string }>;
  tools: ToolConfig[];
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

Takes model name, messages, and tools directly (not by ID).

## ToolExec

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

## AddMessage / AddMessages

```ts
// src/constructs/AddMessage.ts
export interface AddMessageProps {
  memoryId: string;
  currentMessages: Array<{ role: string; content: string }>;
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface AddMessageOutputs {
  added: boolean;
}

export class AddMessage {
  constructor(public props: AddMessageProps) {}
}

// Batch version
export interface AddMessagesProps {
  memoryId: string;
  currentMessages: Array<{ role: string; content: string }>;
  newMessages: Array<{ role: string; content: string }>;
}

export interface AddMessagesOutputs {
  added: boolean;
}

export class AddMessages {
  constructor(public props: AddMessagesProps) {}
}
```

The provider emits `outputsChanged` to update Memory.

## HttpServer

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

The Express app lives in the provider, not in outputs.

## ChatHandler

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

When a message arrives, the provider updates `pending`.

## ChatResponse

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
