import { describe, it, expect, vi } from 'vitest';
import { handleChatTurn } from '../src/chat.js';

describe('handleChatTurn', () => {
  it('handles a simple response with no tool use', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Hæ! Hvernig get ég hjálpað?' }],
          stop_reason: 'end_turn',
        }),
      },
    };

    const result = await handleChatTurn({
      client: mockClient,
      model: 'claude-sonnet-4-6-20250514',
      systemPrompt: 'You are a helper.',
      messages: [{ role: 'user', content: 'Hæ' }],
      tools: [],
      executeTool: vi.fn(),
    });

    expect(result.response.content[0].text).toBe('Hæ! Hvernig get ég hjálpað?');
    expect(result.messages).toHaveLength(2); // user + assistant
  });

  it('loops when Claude makes tool calls then responds', async () => {
    const mockClient = {
      messages: {
        create: vi.fn()
          .mockResolvedValueOnce({
            content: [
              { type: 'text', text: 'Ég ætla að fletta þessu upp.' },
              { type: 'tool_use', id: 'call_1', name: 'read_file', input: { path: 'kids/feeding.md' } },
            ],
            stop_reason: 'tool_use',
          })
          .mockResolvedValueOnce({
            content: [{ type: 'text', text: 'Barnið borðar klukkan 7, 12 og 17.' }],
            stop_reason: 'end_turn',
          }),
      },
    };

    const executeTool = vi.fn().mockReturnValue('# Feeding\n\nEats at 7, 12, 17.');

    const result = await handleChatTurn({
      client: mockClient,
      model: 'claude-sonnet-4-6-20250514',
      systemPrompt: 'You are a helper.',
      messages: [{ role: 'user', content: 'Hvenær borðar barnið?' }],
      tools: [],
      executeTool,
    });

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenCalledWith('read_file', { path: 'kids/feeding.md' });
    expect(result.response.content[0].text).toContain('7, 12 og 17');
    // Messages: user, assistant (tool_use), user (tool_result), assistant (final)
    expect(result.messages).toHaveLength(4);
  });
});
