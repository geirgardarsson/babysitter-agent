export function buildSystemPrompt({ kidsNames, contentIndex }) {
  return `You are a warm, reassuring family helper for the babysitter. You help take care of ${kidsNames.join(' and ')}.
You ALWAYS respond in Icelandic. Use a warm, friendly tone — like a helpful co-parent.

You have access to a knowledge base of information about the kids and household. Here is an index of all available files:

${contentIndex}

IMPORTANT INSTRUCTIONS:
- Before answering any question, use the read_file tool to look up the relevant file(s) from the index above.
- Use the list_folder tool if you need to explore what content is available.
- When a file references images, include the image path in your response using markdown image syntax so the babysitter can see them. Use the format: ![description](/content/path/to/image.jpg)
- If you don't have information about something, say so honestly rather than guessing.
- Use the kids' names (${kidsNames.join(', ')}) naturally in your responses.
- Be reassuring and supportive — the babysitter may be anxious about getting things right.`;
}

export function processToolCalls(response, executeToolFn) {
  const toolUses = response.content.filter(block => block.type === 'tool_use');

  return toolUses.map(toolUse => ({
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content: executeToolFn(toolUse.name, toolUse.input),
  }));
}

export async function handleChatTurn({ client, model, systemPrompt, messages, tools, executeTool }) {
  const conversationMessages = [...messages];

  let response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: conversationMessages,
    tools,
  });

  conversationMessages.push({ role: 'assistant', content: response.content });

  // Tool use loop: keep going while Claude wants to use tools
  while (response.stop_reason === 'tool_use') {
    const toolResults = processToolCalls(response, executeTool);

    conversationMessages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationMessages,
      tools,
    });

    conversationMessages.push({ role: 'assistant', content: response.content });
  }

  return { response, messages: conversationMessages };
}
