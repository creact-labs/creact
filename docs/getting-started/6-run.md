# 6. Run

## Entry point

```tsx
// src/app.tsx
import { CReact, renderCloudDOM } from '@creact-labs/creact';
import { App } from './components/App';
import { Provider } from './providers/Provider';
import { FileBackend } from './providers/FileBackend';

CReact.provider = new Provider();
CReact.backend = new FileBackend({
  directory: './.creact-state',
});

export default async function main() {
  await renderCloudDOM(<App />, 'agent');
}

main().catch(console.error);
```

The `creact` CLI looks for a default export named `main`.

## Chat UI

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Agent</title>
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
    .user {
      background: #3b82f6;
      margin-left: auto;
    }
    .assistant {
      background: #1e293b;
    }
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
    #input:focus { outline: none; }
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
      div.textContent = text;
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

## Start the agent

```bash
npm run dev
```

Open http://localhost:3000.

## What happens

1. Browser POSTs to `/chat` with your message
2. ChatHandler stores the pending message, emits `outputsChanged`
3. CReact re-renders the component tree
4. `chat.pending()` now returns the message
5. Agent component renders with the prompt
6. Completion calls OpenAI with the message and tools
7. If OpenAI wants to search Wikipedia, ToolExec runs the query
8. A second Completion call gets the final response
9. SaveMessages updates Memory (emits `outputsChanged` to persist)
10. SendResponse sends the response back to the browser
11. ChatHandler's pending clears, tree returns to waiting state

## Persistence

Restart the agent. Conversation history persists in `.creact-state/agent.json`.

Reset with `npm run cleanup`.

## Next steps

- Add more tools
- Add system prompts
- Implement memory window size
- Add multiple chat sessions
