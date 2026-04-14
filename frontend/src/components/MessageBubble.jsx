const VALID_ROLES = new Set(['user', 'assistant']);

export default function MessageBubble({ role, html }) {
  const safeRole = VALID_ROLES.has(role) ? role : 'assistant';
  return (
    <div className={`message ${safeRole}`}>
      <div className="bubble" dangerouslySetInnerHTML={{ __html: html ?? '' }} />
    </div>
  );
}
