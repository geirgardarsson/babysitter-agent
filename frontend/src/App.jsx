import { useState, useRef, useCallback } from 'react';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import { sendChatMessage } from './utils/api.js';
import { renderMarkdown, escapeHtml } from './utils/markdown.js';

let nextId = 1;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesRef.current?.scrollToBottom();
  }, []);

  async function sendMessage(text) {
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: 'user', html: escapeHtml(text) },
    ]);
    scrollToBottom();
    setLoading(true);

    try {
      const data = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', html: renderMarkdown(data.reply) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', html: '<em>Villa kom upp. Reyndu aftur.</em>' },
      ]);
    }

    setLoading(false);
    scrollToBottom();
  }

  return (
    <div id="chat-app">
      <header>
        <h1>Fjölskylduaðstoð</h1>
      </header>
      <ChatMessages ref={messagesRef} messages={messages} loading={loading} />
      <ChatInput onSubmit={sendMessage} loading={loading} />
    </div>
  );
}
