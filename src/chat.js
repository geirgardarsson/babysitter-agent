import { execFile } from 'child_process';

export function buildSystemPrompt({ kidsNames, allContent }) {
  return `You are a warm, reassuring family helper for the babysitter. You help take care of ${kidsNames.join(' and ')}.
You ALWAYS respond in Icelandic. Use a warm, friendly tone — like a helpful co-parent.

Here is all the information about the kids and household:

${allContent}

IMPORTANT INSTRUCTIONS:
- Answer questions based on the information above.
- When the information references images, include the image path in your response using markdown image syntax so the babysitter can see them. Use the format: ![description](/content/path/to/image.jpg)
- If you don't have information about something, say so honestly rather than guessing.
- Use the kids' names (${kidsNames.join(', ')}) naturally in your responses.
- Be reassuring and supportive — the babysitter may be anxious about getting things right.`;
}

export function buildConversationPrompt(systemPrompt, messages) {
  // Build a prompt that includes conversation history
  let prompt = '';
  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `\n\nHuman: ${msg.content}`;
    } else if (msg.role === 'assistant') {
      prompt += `\n\nAssistant: ${msg.content}`;
    }
  }
  return prompt.trim();
}

export function claudePrint(systemPrompt, conversationPrompt) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'claude',
      ['--print', '--system-prompt', systemPrompt],
      { maxBuffer: 1024 * 1024, timeout: 120000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`claude --print failed: ${error.message}`));
          return;
        }
        resolve(stdout.trim());
      }
    );
    child.stdin.write(conversationPrompt);
    child.stdin.end();
  });
}

export async function handleChatTurn({ systemPrompt, messages }) {
  const conversationPrompt = buildConversationPrompt(systemPrompt, messages);
  const reply = await claudePrint(systemPrompt, conversationPrompt);

  const updatedMessages = [
    ...messages,
    { role: 'assistant', content: reply },
  ];

  return { reply, messages: updatedMessages };
}
