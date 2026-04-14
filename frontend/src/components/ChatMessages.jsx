import { useRef, forwardRef, useImperativeHandle } from 'react';
import MessageBubble from './MessageBubble.jsx';
import LoadingDots from './LoadingDots.jsx';

const ChatMessages = forwardRef(function ChatMessages({ messages, loading }, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToBottom() {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
  }));

  return (
    <main id="chat-messages" ref={containerRef}>
      {messages.length === 0 && (
        <div className="message assistant">
          <div className="bubble">
            Hæ! Ég er hér til að hjálpa þér með allt sem snýr að börnunum og heimilinu. Spurðu mig um hvað sem er!
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} html={msg.html} />
      ))}
      {loading && <LoadingDots />}
    </main>
  );
});

export default ChatMessages;
