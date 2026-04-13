export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return '#';
    }
    return url;
  } catch {
    return '#';
  }
}

export function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Images: ![alt](src)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${sanitizeUrl(src)}" alt="${alt}">`);

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => `<a href="${sanitizeUrl(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`);

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
