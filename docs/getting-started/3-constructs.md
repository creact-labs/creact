# 3. Constructs

> **Full example**: [creact-agentic-chatbot-example](https://github.com/creact-labs/creact-agentic-chatbot-example)

Constructs define data shapes. Each has props (input) and outputs (result).

## HttpServer

```ts
// src/components/server/HttpServer.construct.ts
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

```ts
// src/components/chat/ChatHandler.construct.ts
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

## ChatModel

```ts
// src/components/chat/ChatModel.construct.ts
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
// src/components/memory/Memory.construct.ts
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

## AddMessages

```ts
// src/components/memory/AddMessage.construct.ts
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

## Completion

```ts
// src/components/completion/Completion.construct.ts
export interface CompletionProps {
  requestId: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (args: Record<string, any>) => Promise<string>;
  }>;
}

export interface CompletionOutputs {
  id: string;
  status: 'pending' | 'complete';
  response: string | null;
  requestId: string;
}

export class Completion {
  constructor(public props: CompletionProps) {}
}
```

Tools include an `execute` function. The provider runs the tool loop internally.

## Message

```ts
// src/components/message/Message.construct.ts
export interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MessageOutputs {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class Message {
  constructor(public props: MessageProps) {}
}
```

## ChatResponse

```ts
// src/components/chat/ChatResponse.construct.ts
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
