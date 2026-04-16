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
  const [pendingImages, setPendingImages] = useState([]);
  const [toast, setToast] = useState(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollToBottom();
  }, [messages, loading]);

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
    <div
      id="chat-app"
      className="flex flex-col w-full sm:max-w-[760px] h-full sm:h-[min(720px,90vh)] sm:rounded-[18px] overflow-hidden relative bg-[#faf6f1] sm:shadow-[0_24px_64px_rgba(0,0,0,0.22),_0_4px_16px_rgba(0,0,0,0.10)]"
    >
      <header className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 bg-gradient-to-br from-[#d96a38] to-[#8c3a16]">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0 select-none">
          👨‍👩‍👧‍👦
        </div>
        <div className="flex-1">
          <h1 className="text-[1.05rem] font-semibold tracking-tight text-white leading-tight">Foreldrar</h1>
          <div className="text-xs text-white/70 mt-0.5">Uppfærðu upplýsingar um heimilið</div>
        </div>
        <button
          className="flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0"
          onClick={handleNewChat}
          disabled={loading}
        >
          Ný lota
        </button>
      </header>

      <div className="flex flex-row flex-1 overflow-hidden relative min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          <ChatMessages
            ref={messagesRef}
            messages={messages}
            loading={loading}
            emptyMessage="Hæ! Segðu mér hvað þú vilt skrá um heimilið eða börnin."
          />

          {pendingImages.length > 0 && (
            <div className="flex gap-2 px-5 pt-2 pb-0 flex-wrap bg-white border-t border-[#e4d4c4]">
              {pendingImages.map(img => (
                <div key={img.id} className="relative w-[60px] h-[60px] rounded-lg overflow-hidden border-[1.5px] border-[#e4d4c4] flex-shrink-0 mb-2">
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover block" />
                  {!img.path && <div className="image-uploading" />}
                  <button
                    className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-black/55 text-white border-0 cursor-pointer text-xs flex items-center justify-center p-0 leading-none"
                    onClick={() => removePendingImage(img.id)}
                    aria-label="Fjarlægja mynd"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <footer className="px-5 py-3.5 border-t border-[#e4d4c4] bg-white/70 backdrop-blur-sm flex-shrink-0">
            <form className="flex gap-2.5 items-center" onSubmit={handleSubmit}>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="w-10 h-10 rounded-full border-[1.5px] border-[#e4d4c4] bg-transparent text-[#b09880] hover:border-[#d96a38] hover:text-[#d96a38] flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                // text-base = 16px, prevents iOS viewport zoom on focus
                className="flex-1 px-4 py-2.5 border-[1.5px] border-[#e4d4c4] rounded-full text-base font-[inherit] outline-none bg-[#faf6f1] text-[#1c1612] placeholder:text-[#b0a494] focus:border-[#d96a38] focus:bg-white transition-colors disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                aria-label="Senda"
                className="w-10 h-10 rounded-full border-0 bg-gradient-to-br from-[#d96a38] to-[#a84e1e] text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:from-[#b85220] hover:to-[#8c3818] hover:scale-[1.05] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 shadow-sm"
              >
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
        <div className="toast-enter absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 bg-[#a84e1e] text-white px-4 py-2 rounded-full text-[0.82rem] whitespace-nowrap pointer-events-none shadow-md z-20">
          {toast}
        </div>
      )}
    </div>
  );
}
