const VALID_ROLES = new Set(['user', 'assistant']);

export default function MessageBubble({ role, html }) {
  const safeRole = VALID_ROLES.has(role) ? role : 'assistant';
  const isUser = safeRole === 'user';
  return (
    <div className={`flex items-end ${isUser ? 'justify-end bubble-user' : 'justify-start'}`}>
      <div
        className={[
          'bubble max-w-[70%] px-4 py-3 rounded-[1.25rem] text-[0.925rem] leading-relaxed shadow-sm break-words',
          isUser
            ? 'bg-gradient-to-br from-[#d96a38] to-[#a84e1e] text-white rounded-br-[0.3rem]'
            : 'bg-white text-[#1c1612] border border-[#e4d4c4] rounded-bl-[0.3rem]',
        ].join(' ')}
        dangerouslySetInnerHTML={{ __html: html ?? '' }}
      />
    </div>
  );
}
