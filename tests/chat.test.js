import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, processToolCalls } from '../src/chat.js';

describe('buildSystemPrompt', () => {
  it('includes kids names, personality, and content index', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna', 'Bjarki'],
      contentIndex: '- **Matartími** (kids/baby/feeding.md): Feeding schedule for baby',
    });

    expect(prompt).toContain('Anna');
    expect(prompt).toContain('Bjarki');
    expect(prompt).toContain('Matartími');
    expect(prompt).toContain('kids/baby/feeding.md');
    expect(prompt).toContain('Icelandic');
  });

  it('includes instructions to use tools before answering', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna'],
      contentIndex: '- **Test** (test.md): Summary',
    });

    expect(prompt).toContain('read_file');
  });
});

describe('processToolCalls', () => {
  it('executes tool calls and returns tool results', () => {
    const response = {
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Let me check that.' },
        { type: 'tool_use', id: 'call_1', name: 'read_file', input: { path: 'test.md' } },
      ],
    };

    const mockExecute = vi.fn().mockReturnValue('# Test\n\nFile content.');

    const results = processToolCalls(response, mockExecute);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      type: 'tool_result',
      tool_use_id: 'call_1',
      content: '# Test\n\nFile content.',
    });
    expect(mockExecute).toHaveBeenCalledWith('read_file', { path: 'test.md' });
  });

  it('returns empty array when no tool calls', () => {
    const response = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Here is the answer.' }],
    };

    const results = processToolCalls(response, vi.fn());
    expect(results).toEqual([]);
  });
});
