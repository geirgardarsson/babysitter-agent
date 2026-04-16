function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Í gær';
  if (diffDays < 7) return date.toLocaleDateString('is-IS', { weekday: 'long' });
  return date.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
}

export default function SessionSidebar({ open, sessions, activeId, onSelect, onNew, loading }) {
  const visibleSessions = sessions.filter(s => s.messageCount > 0 || s.id === activeId);

  return (
    // Outer shell: animated width so toggling is smooth (no layout jump)
    <aside
      className={[
        'flex-shrink-0 bg-[#f4ede4] flex flex-col overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        // On mobile the sidebar floats over the chat; on desktop it's a panel
        'max-sm:absolute max-sm:top-0 max-sm:left-0 max-sm:h-full max-sm:z-10',
        open
          ? 'w-[210px] border-r border-[#e4d4c4] max-sm:shadow-[4px_0_16px_rgba(0,0,0,0.12)]'
          : 'w-0',
      ].join(' ')}
    >
      {/* Inner container stays 210 px wide so content doesn't squish during animation */}
      <div className="w-[210px] flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-[#e4d4c4] flex-shrink-0">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#d96a38] hover:bg-[#b85220] text-white rounded-lg text-[0.85rem] font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onNew}
            disabled={loading}
            title="Nýr samtal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nýr samtal
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto py-2 px-1.5 flex flex-col gap-0.5 scroll-sidebar list-none m-0">
          {visibleSessions.length === 0 && (
            <li className="text-[0.82rem] text-[#b09880] px-2 py-3">Engin saga</li>
          )}
          {visibleSessions.map(session => (
            <li key={session.id}>
              <button
                className={[
                  'w-full text-left rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-colors cursor-pointer',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  session.id === activeId
                    ? 'bg-[rgba(217,106,56,0.14)]'
                    : 'hover:bg-[rgba(0,0,0,0.05)]',
                ].join(' ')}
                onClick={() => onSelect(session.id)}
                disabled={loading}
              >
                <span className="text-[0.82rem] text-[#1c1612] leading-snug line-clamp-2">
                  {session.preview ?? 'Nýr samtal'}
                </span>
                <span className="text-[0.72rem] text-[#8a7e74]">{formatDate(session.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
