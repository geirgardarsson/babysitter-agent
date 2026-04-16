import { useRef, forwardRef, useImperativeHandle } from 'react';
import MessageBubble from './MessageBubble.jsx';
import LoadingDots from './LoadingDots.jsx';

const ChatMessages = forwardRef(function ChatMessages({ messages = [], loading, emptyMessage }, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToBottom() {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
  }), []);

  return (
    <main
      ref={containerRef}
      className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-2.5 scroll-custom min-h-0"
    >
      {messages.length === 0 && (
        <div className="flex items-end justify-start">
          <div className="bubble max-w-[70%] px-4 py-3 rounded-[1.25rem] rounded-bl-[0.3rem] bg-white border border-[#e4d4c4] text-[#1c1612] text-[0.925rem] leading-relaxed shadow-sm break-words">
            {emptyMessage ?? 'Hæ! Ég er hér til að hjálpa þér með allt sem snýr að börnunum og heimilinu. Spurðu mig um hvað sem er!'}
          </div>
        </div>
      )}
      {messages.map(msg => (
        <MessageBubble key={msg.id} role={msg.role} html={msg.html} />
      ))}
      {loading && <LoadingDots />}
    </main>
  );
});

export default ChatMessages;
