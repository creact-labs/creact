# 6. Run

> **Full example**: [creact-agentic-chatbot-example](https://github.com/creact-labs/creact-agentic-chatbot-example)

## Entry Point

```tsx
// app.tsx
import { CReact, renderCloudDOM } from '@creact-labs/creact';
import { App } from './src/components/App';
import { Provider } from './src/providers/Provider';
import { FileBackend } from './src/providers/FileBackend';

CReact.provider = new Provider();
CReact.backend = new FileBackend({
  directory: './.creact-state',
});

export default async function main() {
  await renderCloudDOM(<App />, 'agent');
}
```

## Chat UI

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Agent</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1rem;
    }
    .message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      border-radius: 1rem;
    }
    .user { background: #3b82f6; margin-left: auto; }
    .assistant { background: #1e293b; }
    .assistant p { margin: 0.5em 0; }
    .assistant code { background: #0f172a; padding: 0.2em 0.4em; border-radius: 0.25em; }
    .assistant pre { background: #0f172a; padding: 0.75em; border-radius: 0.5em; overflow-x: auto; }
    .assistant pre code { background: none; padding: 0; }
    #input-area {
      padding: 1rem;
      background: #1e293b;
      display: flex;
      gap: 0.5rem;
    }
    #input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid #3b82f6;
      border-radius: 0.5rem;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 1rem;
    }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      background: #3b82f6;
      color: white;
      cursor: pointer;
    }
    button:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div id="input-area">
    <input type="text" id="input" placeholder="Ask something..." autofocus>
    <button id="send">Send</button>
  </div>
  <script>
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');

    function addMessage(text, role) {
      const div = document.createElement('div');
      div.className = 'message ' + role;
      if (role === 'assistant') {
        div.innerHTML = marked.parse(text);
      } else {
        div.textContent = text;
      }
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      input.value = '';
      send.disabled = true;

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        addMessage(data.response, 'assistant');
      } catch (err) {
        addMessage('Error: ' + err.message, 'assistant');
      }

      send.disabled = false;
      input.focus();
    }

    send.onclick = sendMessage;
    input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
  </script>
</body>
</html>
```

## Start

```bash
npm run dev
```

Open http://localhost:3000.

## Event Flow

```
1. Browser POSTs to /chat
   └─► ChatHandler stores pending, emits outputsChanged

2. CReact re-renders
   └─► chat.pending() returns message
   └─► Completion starts

3. OpenAI returns tool calls
   └─► Provider executes tools (web_search, browse_page)
   └─► Results added to messages
   └─► Loop continues

4. OpenAI returns final response
   └─► Provider emits outputsChanged
   └─► SaveMessages updates Memory
   └─► SendResponse sends to browser

5. ChatHandler clears pending
   └─► Tree returns to waiting state
```

## Persistence

Restart the chatbot. Conversation history persists in `.creact-state/agent.json`.

Reset with `npm run cleanup`.
