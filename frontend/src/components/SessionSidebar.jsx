function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Í gær';
  if (diffDays < 7) {
    return date.toLocaleDateString('is-IS', { weekday: 'long' });
  }
  return date.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
}

export default function SessionSidebar({ sessions, activeId, onSelect, onNew, loading }) {
  const visibleSessions = sessions.filter(s => s.messageCount > 0 || s.id === activeId);

  return (
    <aside className="session-sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNew} disabled={loading} title="Nýr samtal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nýr samtal
        </button>
      </div>

      <ul className="session-list">
        {visibleSessions.length === 0 && (
          <li className="session-empty">Engin saga</li>
        )}
        {visibleSessions.map(session => (
          <li key={session.id}>
            <button
              className={`session-item${session.id === activeId ? ' active' : ''}`}
              onClick={() => onSelect(session.id)}
              disabled={loading}
            >
              <span className="session-preview">
                {session.preview ?? 'Nýr samtal'}
              </span>
              <span className="session-date">{formatDate(session.updatedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
