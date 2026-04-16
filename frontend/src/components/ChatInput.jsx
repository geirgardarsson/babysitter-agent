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
    <footer className="px-5 py-3.5 border-t border-[#e4d4c4] bg-white/70 backdrop-blur-sm flex-shrink-0">
      <form className="flex gap-2.5 items-center" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Skrifaðu spurningu..."
          disabled={loading}
          ref={inputRef}
          autoComplete="off"
          // text-base = 1rem = 16px — prevents iOS from zooming in on focus
          className="flex-1 px-4 py-2.5 border-[1.5px] border-[#e4d4c4] rounded-full text-base font-[inherit] outline-none bg-[#faf6f1] text-[#1c1612] placeholder:text-[#b0a494] focus:border-[#d96a38] focus:bg-white transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
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
  );
}
