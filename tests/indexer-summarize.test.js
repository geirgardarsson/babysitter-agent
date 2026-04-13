import { describe, it, expect, vi } from 'vitest';
import { generateSummary } from '../src/indexer.js';

describe('generateSummary', () => {
  it('calls Anthropic API and returns the summary text', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'A schedule for baby feeding times and formula prep.' }],
        }),
      },
    };

    const summary = await generateSummary(
      mockClient,
      'claude-sonnet-4-6-20250514',
      'Matartími\n\nBarnið borðar á þessum tímum:\n- 07:00 morgunmatur\n- 12:00 hádegismatur'
    );

    expect(summary).toBe('A schedule for baby feeding times and formula prep.');
    expect(mockClient.messages.create).toHaveBeenCalledOnce();

    const callArgs = mockClient.messages.create.mock.calls[0][0];
    expect(callArgs.model).toBe('claude-sonnet-4-6-20250514');
    expect(callArgs.max_tokens).toBe(100);
  });
});
