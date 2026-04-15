import { spawn } from 'child_process';

export function buildSystemPrompt({ kidsNames, allContent }) {
  return `You are a warm, reassuring family helper for the babysitter. You help take care of ${kidsNames.join(' and ')}.
You ALWAYS respond in Icelandic. Use a warm, friendly tone — like a helpful co-parent.

Here is all the information about the kids and household:

${allContent}

IMPORTANT INSTRUCTIONS:
- Answer questions based on the information above.
- When the information references images, include the image path in your response using markdown image syntax so the babysitter can see them. Use the format: ![description](/content/path/to/image.jpg)
- If you don't have information about something, say so honestly rather than guessing. 
- DON'T fabricate information about the kids.
- You're allowed to give additional advice, use you're best judgement on when and whether that's necessary.
- You're allowed to answer general questions unrelated to the kids.
- Use the kids' names (${kidsNames.join(', ')}) naturally in your responses.
- Be reassuring, supportive and funny. Include jokes in your responses periodically`;
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
    const child = spawn('claude', ['--print', '--system-prompt', systemPrompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`claude --print exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.on('error', (err) => {
      reject(new Error(`claude --print failed to start: ${err.message}`));
    });

    child.stdin.write(conversationPrompt);
    child.stdin.end();
  });
}

export async function checkClaudeAuth() {
  try {
    await claudePrint('You are a test assistant.', 'Human: ping\n\nAssistant:');
  } catch (err) {
    throw new Error(`Claude CLI auth check failed: ${err.message}`);
  }
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
