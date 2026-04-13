function chatApp() {
  return {
    messages: [],
    input: '',
    loading: false,
    subtitle: '',
    nextId: 1,

    init() {
      this.$refs.input.focus();
    },

    async sendMessage() {
      const text = this.input.trim();
      if (!text || this.loading) return;

      this.input = '';
      this.messages.push({
        id: this.nextId++,
        role: 'user',
        html: escapeHtml(text),
      });

      this.scrollToBottom();
      this.loading = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          throw new Error('Server error');
        }

        const data = await res.json();
        this.messages.push({
          id: this.nextId++,
          role: 'assistant',
          html: renderMarkdown(data.reply),
        });
      } catch {
        this.messages.push({
          id: this.nextId++,
          role: 'assistant',
          html: '<em>Villa kom upp. Reyndu aftur.</em>',
        });
      }

      this.loading = false;
      this.scrollToBottom();
      this.$nextTick(() => this.$refs.input.focus());
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messages;
        el.scrollTop = el.scrollHeight;
      });
    },
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  // Lightweight markdown rendering for chat messages
  let html = escapeHtml(text);

  // Images: ![alt](src)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs: double newlines
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Single newlines within paragraphs
  html = html.replace(/\n/g, '<br>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
