export default function MessageBubble({ role, html }) {
  return (
    <div className={`message ${role}`}>
      <div className="bubble" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
