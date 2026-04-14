import fs from 'fs';
import path from 'path';
import { handleChatTurn } from './chat.js';

export function buildParentSystemPrompt({ allContent }) {
  return `You are a content management assistant for a household information system used by parents and babysitters.
You ALWAYS respond in Icelandic. Be concise and friendly.

Your job is to help parents document information about their household — kids, routines, allergies, contacts, etc.
This information is stored as markdown files and shown to babysitters.

Here is the current household information:

${allContent}

IMPORTANT INSTRUCTIONS:
- When the parent provides information that should be saved, emit one or more file-op blocks in your response.
- A file-op block looks like this (use exactly this format):

\`\`\`file-op
{"action":"write_file","path":"kids/anna.md","content":"# Anna\\n\\nHér kemur efnið..."}
\`\`\`

- Supported actions: "write_file" (create or overwrite a file) and "delete_file" (delete a file).
- Paths are relative to the content directory. Use subdirectories like "kids/" or "household/".
- Write clean, well-structured Markdown. Add YAML frontmatter with "tags" when relevant.
- If the parent asks a question or wants to chat without saving anything, just reply conversationally — no file-op block needed.
- Keep your conversational reply (outside file-op blocks) brief. Confirm what you saved in plain language.
- If an uploaded image path is mentioned, reference it in the relevant markdown file using: ![description](../images/filename.jpg)`;
}

const FILE_OP_REGEX = /```file-op\s*\n([\s\S]*?)\n```/g;

export function parseFileOps(rawReply) {
  const fileOps = [];
  let displayReply = rawReply;

  for (const match of rawReply.matchAll(FILE_OP_REGEX)) {
    const block = match[0];
    const json = match[1].trim();
    try {
      const op = JSON.parse(json);
      if (op.action && op.path) {
        fileOps.push(op);
      }
    } catch {
      console.warn('Skipping malformed file-op block:', json.slice(0, 100));
    }
    displayReply = displayReply.replace(block, '').trim();
  }

  return { displayReply, fileOps };
}

export function applyFileOps(fileOps, contentDir) {
  const written = [];
  for (const op of fileOps) {
    // Sanitise path: no absolute paths, no traversal outside contentDir
    const safePath = path.normalize(op.path).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(path.resolve(contentDir), safePath);

    if (!fullPath.startsWith(path.resolve(contentDir) + path.sep) &&
        fullPath !== path.resolve(contentDir)) {
      console.warn('Blocked path traversal attempt:', op.path);
      continue;
    }

    if (op.action === 'write_file') {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, op.content ?? '', 'utf-8');
      written.push(safePath);
    } else if (op.action === 'delete_file') {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        written.push(safePath);
      }
    }
  }
  return written;
}

export async function handleParentTurn({ systemPrompt, messages }) {
  const result = await handleChatTurn({ systemPrompt, messages });
  const { displayReply, fileOps } = parseFileOps(result.reply);
  return { displayReply, fileOps, rawReply: result.reply };
}
