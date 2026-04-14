import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loading) {
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
        <button type="submit" disabled={loading || !value.trim()}>
          Senda
        </button>
      </form>
    </footer>
  );
}
