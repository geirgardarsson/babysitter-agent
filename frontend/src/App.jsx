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

  // Scroll to bottom on new messages AND when loading dots appear/disappear
  useEffect(() => {
    messagesRef.current?.scrollToBottom();
  }, [messages, loading]);

  const loadSessions = useCallback(async () => {
    try {
      const list = await fetchSessions();
      setSessions(list);
    } catch {
      // non-fatal
    }
  }, []);

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
    <div
      id="chat-app"
      className="flex flex-col w-full sm:max-w-[760px] h-full sm:h-[min(720px,90vh)] sm:rounded-[18px] overflow-hidden relative bg-[#faf6f1] sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),_0_4px_16px_rgba(0,0,0,0.10)]"
    >
      <header className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 bg-gradient-to-br from-[#d96a38] to-[#8c3a16]">
        <button
          className="text-white/80 hover:text-white hover:bg-white/15 transition-all p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
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
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0 select-none">
          🏠
        </div>
        <div>
          <h1 className="text-[1.05rem] font-semibold tracking-tight text-white leading-tight">Fjölskylduvélmennið</h1>
          <div className="text-xs text-white/70 mt-0.5">Aðstoðarmaður fyrir barnvörður</div>
        </div>
      </header>

      <div className="flex flex-row flex-1 overflow-hidden relative min-h-0">
        {/* Sidebar: always rendered, width-animated to avoid layout jumps */}
        <SessionSidebar
          open={sidebarOpen}
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          loading={loading}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          {/* Overlay only needed on mobile where sidebar floats over the chat */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-[5] bg-black/25 sm:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <ChatMessages ref={messagesRef} messages={messages} loading={loading} />
          <ChatInput onSubmit={sendMessage} loading={loading} />
        </div>
      </div>
    </div>
  );
}
