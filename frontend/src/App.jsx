import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import SessionSidebar from './components/SessionSidebar.jsx';
import {
  sendChatMessage,
  fetchSessions,
  fetchCurrentSession,
  createNewSession,
  activateSession,
} from './utils/api.js';
import { renderMarkdown, escapeHtml } from './utils/markdown.js';

let nextId = 1;

function sessionMessagesToUi(rawMessages) {
  return rawMessages.map(msg => ({
    id: nextId++,
    role: msg.role,
    html: msg.role === 'assistant' ? renderMarkdown(msg.content) : escapeHtml(msg.content),
  }));
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollToBottom();
  }, [messages]);

  const loadSessions = useCallback(async () => {
    try {
      const list = await fetchSessions();
      setSessions(list);
    } catch {
      // non-fatal
    }
  }, []);

  // On mount: load current session and session list
  useEffect(() => {
    async function init() {
      try {
        const current = await fetchCurrentSession();
        setActiveSessionId(current.id);
        setMessages(sessionMessagesToUi(current.messages));
      } catch {
        // ignore
      }
      await loadSessions();
    }
    init();
  }, [loadSessions]);

  async function sendMessage(text) {
    setMessages(prev => [...prev, { id: nextId++, role: 'user', html: escapeHtml(text) }]);
    setLoading(true);

    try {
      const data = await sendChatMessage(text);
      setMessages(prev => [
        ...prev,
        { id: nextId++, role: 'assistant', html: renderMarkdown(data.reply) },
      ]);
      await loadSessions();
    } catch {
      setMessages(prev => [
        ...prev,
        { id: nextId++, role: 'assistant', html: '<em>Villa kom upp. Reyndu aftur.</em>' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSession(id) {
    if (id === activeSessionId || loading) return;
    setLoading(true);
    try {
      await activateSession(id);
      const current = await fetchCurrentSession();
      setActiveSessionId(current.id);
      setMessages(sessionMessagesToUi(current.messages));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleNewChat() {
    if (loading) return;
    setLoading(true);
    try {
      const { id } = await createNewSession();
      setActiveSessionId(id);
      setMessages([]);
      await loadSessions();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="chat-app">
      <header>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Loka sögu' : 'Opna sögu'}
          title={sidebarOpen ? 'Loka sögu' : 'Opna sögu'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="header-avatar">🏠</div>
        <div className="header-text">
          <h1>Fjölskylduvélmennið</h1>
          <div className="subtitle">Aðstoðarmaður fyrir barnvörður</div>
        </div>
      </header>

      <div className="chat-body">
        {sidebarOpen && (
          <SessionSidebar
            sessions={sessions}
            activeId={activeSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewChat}
            loading={loading}
          />
        )}
        <div className="chat-main">
          {sidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          )}
          <ChatMessages ref={messagesRef} messages={messages} loading={loading} />
          <ChatInput onSubmit={sendMessage} loading={loading} />
        </div>
      </div>
    </div>
  );
}
