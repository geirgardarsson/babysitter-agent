import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessages from '../components/ChatMessages.jsx';
import { renderMarkdown, escapeHtml } from '../utils/markdown.js';
import {
  sendParentMessage,
  uploadParentImage,
  fetchParentSession,
  createNewParentSession,
} from '../utils/api.js';

let nextId = 1;

function sessionMessagesToUi(rawMessages) {
  return rawMessages.map(msg => ({
    id: nextId++,
    role: msg.role,
    html: msg.role === 'assistant' ? renderMarkdown(msg.content) : escapeHtml(msg.content),
  }));
}

export default function ParentPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pendingImages, setPendingImages] = useState([]); // [{ file, path, previewUrl }]
  const [toast, setToast] = useState(null); // string or null
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const loadSession = useCallback(async () => {
    try {
      const current = await fetchParentSession();
      setMessages(sessionMessagesToUi(current.messages));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function showToast(text) {
    setToast(text);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;

    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      // Optimistically add to pending
      const tempId = nextId++;
      setPendingImages(prev => [...prev, { id: tempId, file, path: null, previewUrl }]);

      try {
        const { path: uploadedPath } = await uploadParentImage(file);
        setPendingImages(prev =>
          prev.map(img => img.id === tempId ? { ...img, path: uploadedPath } : img)
        );
      } catch {
        setPendingImages(prev => prev.filter(img => img.id !== tempId));
        URL.revokeObjectURL(previewUrl);
        showToast('Villa við að hlaða upp mynd. Reyndu aftur.');
      }
    }
  }

  function removePendingImage(id) {
    setPendingImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = inputValue.trim();
    if ((!text && pendingImages.length === 0) || loading) return;

    const uploadedPaths = pendingImages.filter(i => i.path).map(i => i.path);

    // Clear input immediately
    setInputValue('');
    setPendingImages(prev => {
      prev.forEach(i => URL.revokeObjectURL(i.previewUrl));
      return [];
    });

    let displayText = text;
    if (uploadedPaths.length > 0 && !text) {
      displayText = `[Myndir: ${uploadedPaths.length}]`;
    }

    setMessages(prev => [...prev, { id: nextId++, role: 'user', html: escapeHtml(displayText) }]);
    setLoading(true);

    try {
      const data = await sendParentMessage(text, uploadedPaths);
      setMessages(prev => [
        ...prev,
        { id: nextId++, role: 'assistant', html: renderMarkdown(data.reply) },
      ]);
      if (data.filesWritten?.length > 0) {
        showToast(`Skrár uppfærðar: ${data.filesWritten.join(', ')}`);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: nextId++, role: 'assistant', html: '<em>Villa kom upp. Reyndu aftur.</em>' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewChat() {
    if (loading) return;
    setLoading(true);
    try {
      await createNewParentSession();
      setMessages([]);
      setPendingImages(prev => {
        prev.forEach(i => URL.revokeObjectURL(i.previewUrl));
        return [];
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && (inputValue.trim().length > 0 || pendingImages.length > 0);

  return (
    <div id="chat-app">
      <header>
        <div className="header-avatar">👨‍👩‍👧‍👦</div>
        <div className="header-text">
          <h1>Foreldrar</h1>
          <div className="subtitle">Uppfærðu upplýsingar um heimilið</div>
        </div>
        <button
          className="new-chat-btn"
          style={{ marginLeft: 'auto', width: 'auto', padding: '0.4rem 0.85rem' }}
          onClick={handleNewChat}
          disabled={loading}
        >
          Ný lota
        </button>
      </header>

      <div className="chat-body">
        <div className="chat-main">
          <ChatMessages ref={messagesRef} messages={messages} loading={loading} emptyMessage="Hæ! Segðu mér hvað þú vilt skrá um heimilið eða börnin." />

          {pendingImages.length > 0 && (
            <div className="image-preview-strip">
              {pendingImages.map(img => (
                <div key={img.id} className="image-preview-item">
                  <img src={img.previewUrl} alt="" />
                  {!img.path && <div className="image-preview-uploading" />}
                  <button
                    className="image-preview-remove"
                    onClick={() => removePendingImage(img.id)}
                    aria-label="Fjarlægja mynd"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <footer>
            <form onSubmit={handleSubmit}>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Hlaða upp mynd"
                title="Hlaða upp mynd"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Skrifaðu upplýsingar um heimilið..."
                disabled={loading}
                ref={inputRef}
                autoComplete="off"
              />
              <button type="submit" className="send-btn" disabled={!canSubmit} aria-label="Senda">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </footer>
        </div>
      </div>

      {toast && (
        <div className="parent-toast">{toast}</div>
      )}
    </div>
  );
}
