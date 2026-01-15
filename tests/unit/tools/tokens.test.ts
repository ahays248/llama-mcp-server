/**
 * Tests for src/tools/tokens.ts
 *
 * Tests: llama_tokenize, llama_detokenize, llama_apply_template
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTokenizeTool, createDetokenizeTool, createApplyTemplateTool } from '../../../src/tools/tokens.js';
import type { LlamaClient } from '../../../src/client.js';
import type { TokenizeResponse, DetokenizeResponse, ApplyTemplateResponse } from '../../../src/types.js';

describe('createTokenizeTool', () => {
  let mockClient: LlamaClient;

  beforeEach(() => {
    mockClient = {
      baseUrl: 'http://localhost:8080',
      timeout: 30000,
      health: vi.fn(),
      props: vi.fn(),
      models: vi.fn(),
      slots: vi.fn(),
      metrics: vi.fn(),
      tokenize: vi.fn(),
      detokenize: vi.fn(),
      applyTemplate: vi.fn(),
      complete: vi.fn(),
      chat: vi.fn(),
      embed: vi.fn(),
      infill: vi.fn(),
      rerank: vi.fn(),
      loadModel: vi.fn(),
      unloadModel: vi.fn(),
      loraList: vi.fn(),
      loraSet: vi.fn(),
    } as unknown as LlamaClient;
  });

  it('creates tool with correct name and description', () => {
    const tool = createTokenizeTool(mockClient);

    expect(tool.name).toBe('llama_tokenize');
    expect(tool.description).toBe('Convert text to token IDs');
  });

  it('accepts input with only content (required field)', () => {
    const tool = createTokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: 'Hello, world!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const tool = createTokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: 'Hello, world!',
      add_special: false,
      with_pieces: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without content', () => {
    const tool = createTokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string content', () => {
    const tool = createTokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: 12345,
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns tokens when server responds successfully', async () => {
      const tokenizeResponse: TokenizeResponse = {
        tokens: [1, 15043, 29892, 3186, 29991],
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello, world!' });

      expect(mockClient.tokenize).toHaveBeenCalledWith('Hello, world!', {
        add_special: true,
        with_pieces: false,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(tokenizeResponse);
    });

    it('returns tokens with pieces when with_pieces is true', async () => {
      const tokenizeResponse: TokenizeResponse = {
        tokens: [1, 15043, 29892, 3186, 29991],
        pieces: ['<s>', 'Hello', ',', 'world', '!'],
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({
        content: 'Hello, world!',
        with_pieces: true,
      });

      expect(mockClient.tokenize).toHaveBeenCalledWith('Hello, world!', {
        add_special: true,
        with_pieces: true,
      });
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.tokens).toEqual([1, 15043, 29892, 3186, 29991]);
      expect(parsedContent.pieces).toEqual(['<s>', 'Hello', ',', 'world', '!']);
    });

    it('passes add_special: false when specified', async () => {
      const tokenizeResponse: TokenizeResponse = {
        tokens: [15043, 29892, 3186, 29991],
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({
        content: 'Hello, world!',
        add_special: false,
      });

      expect(mockClient.tokenize).toHaveBeenCalledWith('Hello, world!', {
        add_special: false,
        with_pieces: false,
      });
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.tokens).toEqual([15043, 29892, 3186, 29991]);
    });

    it('returns empty tokens array for empty string', async () => {
      const tokenizeResponse: TokenizeResponse = {
        tokens: [],
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: '' });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.tokens).toEqual([]);
    });

    it('handles long text with many tokens', async () => {
      const longTokens = Array.from({ length: 1000 }, (_, i) => i);
      const tokenizeResponse: TokenizeResponse = {
        tokens: longTokens,
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({
        content: 'A very long text with many tokens...',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.tokens).toHaveLength(1000);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.tokenize).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.tokenize).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.tokenize).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.tokenize).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.tokenize).mockRejectedValue('string error');

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const tokenizeResponse: TokenizeResponse = {
        tokens: [1, 2, 3],
        pieces: ['a', 'b', 'c'],
      };
      vi.mocked(mockClient.tokenize).mockResolvedValue(tokenizeResponse);

      const tool = createTokenizeTool(mockClient);
      const result = await tool.handler({
        content: 'abc',
        with_pieces: true,
      });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(tokenizeResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createTokenizeTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        content: 12345, // Should be string
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});

describe('createDetokenizeTool', () => {
  let mockClient: LlamaClient;

  beforeEach(() => {
    mockClient = {
      baseUrl: 'http://localhost:8080',
      timeout: 30000,
      health: vi.fn(),
      props: vi.fn(),
      models: vi.fn(),
      slots: vi.fn(),
      metrics: vi.fn(),
      tokenize: vi.fn(),
      detokenize: vi.fn(),
      applyTemplate: vi.fn(),
      complete: vi.fn(),
      chat: vi.fn(),
      embed: vi.fn(),
      infill: vi.fn(),
      rerank: vi.fn(),
      loadModel: vi.fn(),
      unloadModel: vi.fn(),
      loraList: vi.fn(),
      loraSet: vi.fn(),
    } as unknown as LlamaClient;
  });

  it('creates tool with correct name and description', () => {
    const tool = createDetokenizeTool(mockClient);

    expect(tool.name).toBe('llama_detokenize');
    expect(tool.description).toBe('Convert token IDs back to text');
  });

  it('accepts input with tokens array', () => {
    const tool = createDetokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      tokens: [1, 15043, 29892, 3186, 29991],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with empty tokens array', () => {
    const tool = createDetokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      tokens: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without tokens', () => {
    const tool = createDetokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with non-array tokens', () => {
    const tool = createDetokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      tokens: 'not an array',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-number array elements', () => {
    const tool = createDetokenizeTool(mockClient);

    const result = tool.inputSchema.safeParse({
      tokens: ['a', 'b', 'c'],
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns text when server responds successfully', async () => {
      const detokenizeResponse: DetokenizeResponse = {
        content: 'Hello, world!',
      };
      vi.mocked(mockClient.detokenize).mockResolvedValue(detokenizeResponse);

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 15043, 29892, 3186, 29991] });

      expect(mockClient.detokenize).toHaveBeenCalledWith([1, 15043, 29892, 3186, 29991]);
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(detokenizeResponse);
    });

    it('returns empty content for empty tokens array', async () => {
      const detokenizeResponse: DetokenizeResponse = {
        content: '',
      };
      vi.mocked(mockClient.detokenize).mockResolvedValue(detokenizeResponse);

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [] });

      expect(mockClient.detokenize).toHaveBeenCalledWith([]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.content).toBe('');
    });

    it('handles long token arrays', async () => {
      const longTokens = Array.from({ length: 1000 }, (_, i) => i);
      const detokenizeResponse: DetokenizeResponse = {
        content: 'A very long text with many tokens...',
      };
      vi.mocked(mockClient.detokenize).mockResolvedValue(detokenizeResponse);

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: longTokens });

      expect(mockClient.detokenize).toHaveBeenCalledWith(longTokens);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.content).toBe('A very long text with many tokens...');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.detokenize).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.detokenize).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.detokenize).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.detokenize).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.detokenize).mockRejectedValue('string error');

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const detokenizeResponse: DetokenizeResponse = {
        content: 'Hello',
      };
      vi.mocked(mockClient.detokenize).mockResolvedValue(detokenizeResponse);

      const tool = createDetokenizeTool(mockClient);
      const result = await tool.handler({ tokens: [1, 2, 3] });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(detokenizeResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createDetokenizeTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        tokens: 'not an array', // Should be array
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});

describe('createApplyTemplateTool', () => {
  let mockClient: LlamaClient;

  beforeEach(() => {
    mockClient = {
      baseUrl: 'http://localhost:8080',
      timeout: 30000,
      health: vi.fn(),
      props: vi.fn(),
      models: vi.fn(),
      slots: vi.fn(),
      metrics: vi.fn(),
      tokenize: vi.fn(),
      detokenize: vi.fn(),
      applyTemplate: vi.fn(),
      complete: vi.fn(),
      chat: vi.fn(),
      embed: vi.fn(),
      infill: vi.fn(),
      rerank: vi.fn(),
      loadModel: vi.fn(),
      unloadModel: vi.fn(),
      loraList: vi.fn(),
      loraSet: vi.fn(),
    } as unknown as LlamaClient;
  });

  it('creates tool with correct name and description', () => {
    const tool = createApplyTemplateTool(mockClient);

    expect(tool.name).toBe('llama_apply_template');
    expect(tool.description).toBe("Format chat messages using model's template without inference");
  });

  it('accepts input with messages array', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with empty messages array', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid roles: system, user, assistant', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without messages', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with non-array messages', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: 'not an array',
    });
    expect(result.success).toBe(false);
  });

  it('rejects messages with invalid role', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [{ role: 'invalid_role', content: 'Hello' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects messages without content', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [{ role: 'user' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects messages with non-string content', () => {
    const tool = createApplyTemplateTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [{ role: 'user', content: 12345 }],
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns formatted prompt when server responds successfully', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\nHello!<|im_end|>\n<|im_start|>assistant\n',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
      });

      expect(mockClient.applyTemplate).toHaveBeenCalledWith([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ]);
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(applyTemplateResponse);
    });

    it('returns formatted prompt for single message', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<|im_start|>user\nHello!<|im_end|>\n<|im_start|>assistant\n',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello!' }],
      });

      expect(mockClient.applyTemplate).toHaveBeenCalledWith([
        { role: 'user', content: 'Hello!' },
      ]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.prompt).toContain('Hello!');
    });

    it('handles empty messages array', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({ messages: [] });

      expect(mockClient.applyTemplate).toHaveBeenCalledWith([]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.prompt).toBe('');
    });

    it('handles long conversation with multiple turns', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Hello!' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'How are you?' },
        { role: 'assistant' as const, content: 'I am doing well.' },
        { role: 'user' as const, content: 'Great!' },
      ];
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<long formatted prompt>',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({ messages });

      expect(mockClient.applyTemplate).toHaveBeenCalledWith(messages);
      expect(result.isError).toBeUndefined();
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.applyTemplate).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.applyTemplate).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.applyTemplate).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.applyTemplate).mockRejectedValue(
        new Error('No chat template defined for this model')
      );

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No chat template defined for this model');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.applyTemplate).mockRejectedValue('string error');

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<|im_start|>user\nHello<|im_end|>\n',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(applyTemplateResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createApplyTemplateTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        messages: 'not an array', // Should be array
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles messages with special characters', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<|im_start|>user\nHello\nWorld!<|im_end|>\n',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello\nWorld!' }],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.prompt).toContain('Hello\nWorld!');
    });

    it('handles messages with unicode content', async () => {
      const applyTemplateResponse: ApplyTemplateResponse = {
        prompt: '<|im_start|>user\n\u4f60\u597d\u4e16\u754c \ud83d\udc4b<|im_end|>\n',
      };
      vi.mocked(mockClient.applyTemplate).mockResolvedValue(applyTemplateResponse);

      const tool = createApplyTemplateTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: '\u4f60\u597d\u4e16\u754c \ud83d\udc4b' }],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.prompt).toContain('\u4f60\u597d\u4e16\u754c');
    });
  });
});
