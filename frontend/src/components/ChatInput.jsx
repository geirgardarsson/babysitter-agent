import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    didMountRef.current = true;
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (didMountRef.current && !loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text || loading) return;
    setValue('');
    onSubmit(text);
  }

  return (
    <footer>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Skrifaðu spurningu..."
          disabled={loading}
          ref={inputRef}
          autoComplete="off"
        />
        <button type="submit" className="send-btn" disabled={loading || !value.trim()} aria-label="Senda">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </footer>
  );
}
