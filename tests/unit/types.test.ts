/**
 * Tests for src/types.ts
 */

import { describe, it, expect } from 'vitest';
import type { Tool, ToolResult, ChatMessage, HealthResponse } from '../../src/types.js';

describe('types', () => {
  it('exports Tool interface that can be used', () => {
    // Type-level test: verify the interface shape
    const mockTool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {} as any,
      handler: async () => ({
        content: [{ type: 'text', text: 'result' }],
      }),
    };

    expect(mockTool.name).toBe('test_tool');
    expect(mockTool.description).toBe('A test tool');
    expect(typeof mockTool.handler).toBe('function');
  });

  it('exports ToolResult interface that can be used', () => {
    const successResult: ToolResult = {
      content: [{ type: 'text', text: 'success' }],
    };

    const errorResult: ToolResult = {
      content: [{ type: 'text', text: 'error message' }],
      isError: true,
    };

    expect(successResult.content[0].text).toBe('success');
    expect(successResult.isError).toBeUndefined();
    expect(errorResult.isError).toBe(true);
  });

  it('exports ChatMessage interface that can be used', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[2].role).toBe('assistant');
  });

  it('exports HealthResponse interface that can be used', () => {
    const health: HealthResponse = {
      status: 'ok',
      slots_idle: 2,
      slots_processing: 0,
    };

    expect(health.status).toBe('ok');
    expect(health.slots_idle).toBe(2);
    expect(health.slots_processing).toBe(0);
  });
});
