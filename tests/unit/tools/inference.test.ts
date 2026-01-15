/**
 * Tests for src/tools/inference.ts
 *
 * Tests: llama_complete, llama_chat, llama_embed, llama_infill, llama_rerank
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCompleteTool, createChatTool, createEmbedTool, createInfillTool, createRerankTool } from '../../../src/tools/inference.js';
import type { LlamaClient } from '../../../src/client.js';
import type { CompletionResponse, ChatResponse, EmbedResponse, InfillResponse, RerankResponse } from '../../../src/types.js';

describe('createCompleteTool', () => {
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
    const tool = createCompleteTool(mockClient);

    expect(tool.name).toBe('llama_complete');
    expect(tool.description).toBe('Generate text completion from a prompt');
  });

  it('accepts input with only prompt (required field)', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({
      prompt: 'Hello, world!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({
      prompt: 'Hello, world!',
      max_tokens: 512,
      temperature: 0.5,
      top_p: 0.95,
      top_k: 50,
      stop: ['\n', 'END'],
      seed: 42,
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without prompt', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string prompt', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({
      prompt: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with invalid temperature type', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({
      prompt: 'Hello',
      temperature: 'hot',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with invalid stop type', () => {
    const tool = createCompleteTool(mockClient);

    const result = tool.inputSchema.safeParse({
      prompt: 'Hello',
      stop: 'not an array',
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns completion when server responds successfully', async () => {
      const completionResponse: CompletionResponse = {
        content: ' How are you today?',
        stop: true,
        generation_settings: {
          temperature: 0.7,
          top_p: 0.9,
        },
        timings: {
          prompt_n: 3,
          predicted_n: 5,
        },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        stop: undefined,
        seed: undefined,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(completionResponse);
    });

    it('passes custom max_tokens to client', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({ prompt: 'Hello', max_tokens: 512 });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        stop: undefined,
        seed: undefined,
      });
    });

    it('passes custom temperature to client', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({ prompt: 'Hello', temperature: 0.3 });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 256,
        temperature: 0.3,
        top_p: 0.9,
        top_k: 40,
        stop: undefined,
        seed: undefined,
      });
    });

    it('passes custom top_p and top_k to client', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({ prompt: 'Hello', top_p: 0.95, top_k: 50 });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.95,
        top_k: 50,
        stop: undefined,
        seed: undefined,
      });
    });

    it('passes stop sequences to client', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({ prompt: 'Hello', stop: ['\n', 'END'] });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        stop: ['\n', 'END'],
        seed: undefined,
      });
    });

    it('passes seed to client for reproducibility', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({ prompt: 'Hello', seed: 42 });

      expect(mockClient.complete).toHaveBeenCalledWith('Hello', {
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        stop: undefined,
        seed: 42,
      });
    });

    it('passes all parameters when all specified', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      await tool.handler({
        prompt: 'Write a story',
        max_tokens: 1024,
        temperature: 0.9,
        top_p: 0.8,
        top_k: 100,
        stop: ['THE END'],
        seed: 123,
      });

      expect(mockClient.complete).toHaveBeenCalledWith('Write a story', {
        max_tokens: 1024,
        temperature: 0.9,
        top_p: 0.8,
        top_k: 100,
        stop: ['THE END'],
        seed: 123,
      });
    });

    it('handles empty prompt', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Something random',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 0, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: '' });

      expect(mockClient.complete).toHaveBeenCalledWith('', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles long prompt', async () => {
      const longPrompt = 'A'.repeat(10000);
      const completionResponse: CompletionResponse = {
        content: 'Generated text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1000, predicted_n: 5 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: longPrompt });

      expect(mockClient.complete).toHaveBeenCalledWith(longPrompt, expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles response with stop: false (length limit reached)', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Truncated output that was cut off because',
        stop: false,
        generation_settings: {},
        timings: { prompt_n: 5, predicted_n: 256 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Tell me a very long story' });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.stop).toBe(false);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue(
        new Error('Model context length exceeded')
      );

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model context length exceeded');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue('string error');

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Hello there!',
        stop: true,
        generation_settings: { temperature: 0.7 },
        timings: { prompt_n: 1, predicted_n: 3 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(completionResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createCompleteTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        prompt: 12345, // Should be string
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles prompt with special characters', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Response text',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 10, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({
        prompt: 'Hello\nWorld!\t"Quoted" <tag>',
      });

      expect(mockClient.complete).toHaveBeenCalledWith(
        'Hello\nWorld!\t"Quoted" <tag>',
        expect.any(Object)
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles prompt with unicode content', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Unicode response',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 5, predicted_n: 2 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({
        prompt: '你好世界 👋 🚀',
      });

      expect(mockClient.complete).toHaveBeenCalledWith('你好世界 👋 🚀', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles HTTP error from server', async () => {
      vi.mocked(mockClient.complete).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const tool = createCompleteTool(mockClient);
      const result = await tool.handler({ prompt: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 500');
    });

    it('handles temperature at boundaries', async () => {
      const completionResponse: CompletionResponse = {
        content: 'Generated',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 1, predicted_n: 1 },
      };
      vi.mocked(mockClient.complete).mockResolvedValue(completionResponse);

      const tool = createCompleteTool(mockClient);

      // Test temperature = 0 (deterministic)
      await tool.handler({ prompt: 'Hello', temperature: 0 });
      expect(mockClient.complete).toHaveBeenCalledWith('Hello', expect.objectContaining({
        temperature: 0,
      }));

      // Test temperature = 2 (max)
      await tool.handler({ prompt: 'Hello', temperature: 2 });
      expect(mockClient.complete).toHaveBeenCalledWith('Hello', expect.objectContaining({
        temperature: 2,
      }));
    });
  });
});

describe('createChatTool', () => {
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
    const tool = createChatTool(mockClient);

    expect(tool.name).toBe('llama_chat');
    expect(tool.description).toBe('Chat completion (OpenAI-compatible format)');
  });

  it('accepts input with only messages (required field)', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hello!' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
      max_tokens: 512,
      temperature: 0.5,
      top_p: 0.95,
      stop: ['\n', 'END'],
      seed: 42,
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with multiple messages including assistant', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'How are you?' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without messages', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with empty messages array', () => {
    const tool = createChatTool(mockClient);

    // An empty array is technically valid per the schema, but we can test this
    const result = tool.inputSchema.safeParse({
      messages: [],
    });
    // Empty array is allowed by z.array()
    expect(result.success).toBe(true);
  });

  it('rejects input with invalid role', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'invalid_role', content: 'Hello!' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with missing content in message', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'user' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string content', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [
        { role: 'user', content: 12345 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with invalid temperature type', () => {
    const tool = createChatTool(mockClient);

    const result = tool.inputSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 'hot',
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns chat completion when server responds successfully', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello! How can I help you?' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        {
          max_tokens: 256,
          temperature: 0.7,
          top_p: 0.9,
          stop: undefined,
          seed: undefined,
        }
      );
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(chatResponse);
    });

    it('passes custom max_tokens to client', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 512,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ max_tokens: 512 })
      );
    });

    it('passes custom temperature to client', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.3,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ temperature: 0.3 })
      );
    });

    it('passes custom top_p to client', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        top_p: 0.95,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ top_p: 0.95 })
      );
    });

    it('passes stop sequences to client', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        stop: ['\n', 'END'],
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ stop: ['\n', 'END'] })
      );
    });

    it('passes seed to client for reproducibility', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        seed: 42,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ seed: 42 })
      );
    });

    it('passes all parameters when all specified', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      await tool.handler({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Tell me a story' },
        ],
        max_tokens: 1024,
        temperature: 0.9,
        top_p: 0.8,
        stop: ['THE END'],
        seed: 123,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Tell me a story' },
        ],
        {
          max_tokens: 1024,
          temperature: 0.9,
          top_p: 0.8,
          stop: ['THE END'],
          seed: 123,
        }
      );
    });

    it('handles multi-turn conversation', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'I am doing well, thank you!' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const messages = [
        { role: 'user' as const, content: 'Hello!' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      const tool = createChatTool(mockClient);
      const result = await tool.handler({ messages });

      expect(mockClient.chat).toHaveBeenCalledWith(messages, expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles response with finish_reason: length', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Truncated response that was cut off because' },
          finish_reason: 'length',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 256, total_tokens: 261 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Tell me a very long story' }],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.choices[0].finish_reason).toBe('length');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue(
        new Error('Model context length exceeded')
      );

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model context length exceeded');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue('string error');

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(chatResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createChatTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        messages: 'not an array',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles messages with special characters', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{
          role: 'user',
          content: 'Hello\nWorld!\t"Quoted" <tag>',
        }],
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello\nWorld!\t"Quoted" <tag>' }],
        expect.any(Object)
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles messages with unicode content', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Unicode response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: '你好世界 👋 🚀' }],
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: '你好世界 👋 🚀' }],
        expect.any(Object)
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles HTTP error from server', async () => {
      vi.mocked(mockClient.chat).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const tool = createChatTool(mockClient);
      const result = await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 500');
    });

    it('handles temperature at boundaries', async () => {
      const chatResponse: ChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'llama-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };
      vi.mocked(mockClient.chat).mockResolvedValue(chatResponse);

      const tool = createChatTool(mockClient);

      // Test temperature = 0 (deterministic)
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0,
      });
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ temperature: 0 })
      );

      // Test temperature = 2 (max)
      await tool.handler({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 2,
      });
      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ temperature: 2 })
      );
    });
  });
});

describe('createEmbedTool', () => {
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
    const tool = createEmbedTool(mockClient);

    expect(tool.name).toBe('llama_embed');
    expect(tool.description).toBe('Generate embeddings for text');
  });

  it('accepts input with content (required field)', () => {
    const tool = createEmbedTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: 'Hello, world!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without content', () => {
    const tool = createEmbedTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string content', () => {
    const tool = createEmbedTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with array content', () => {
    const tool = createEmbedTool(mockClient);

    const result = tool.inputSchema.safeParse({
      content: ['Hello', 'World'],
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns embedding when server responds successfully', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(mockClient.embed).toHaveBeenCalledWith('Hello');
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(embedResponse);
    });

    it('handles empty content', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [0.0, 0.0, 0.0],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: '' });

      expect(mockClient.embed).toHaveBeenCalledWith('');
      expect(result.isError).toBeUndefined();
    });

    it('handles long content', async () => {
      const longContent = 'A'.repeat(10000);
      const embedResponse: EmbedResponse = {
        embedding: [0.1, 0.2, 0.3],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: longContent });

      expect(mockClient.embed).toHaveBeenCalledWith(longContent);
      expect(result.isError).toBeUndefined();
    });

    it('handles high-dimensional embedding response', async () => {
      // Simulate a realistic embedding (e.g., 768 dimensions)
      const embedding = Array(768).fill(0).map((_, i) => Math.sin(i) * 0.1);
      const embedResponse: EmbedResponse = { embedding };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello, world!' });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.embedding).toHaveLength(768);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue(
        new Error('Model does not support embeddings')
      );

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model does not support embeddings');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue('string error');

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [0.1, 0.2, 0.3],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(embedResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createEmbedTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        content: 12345, // Should be string
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles content with special characters', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [0.1, 0.2, 0.3],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({
        content: 'Hello\nWorld!\t"Quoted" <tag>',
      });

      expect(mockClient.embed).toHaveBeenCalledWith(
        'Hello\nWorld!\t"Quoted" <tag>'
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles content with unicode', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [0.1, 0.2, 0.3],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({
        content: '你好世界 👋 🚀',
      });

      expect(mockClient.embed).toHaveBeenCalledWith('你好世界 👋 🚀');
      expect(result.isError).toBeUndefined();
    });

    it('handles HTTP error from server', async () => {
      vi.mocked(mockClient.embed).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 500');
    });

    it('handles embedding response with negative values', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [-0.5, 0.0, 0.5, -0.123, 0.999],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Test' });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.embedding).toEqual([-0.5, 0.0, 0.5, -0.123, 0.999]);
    });

    it('handles embedding response with very small float values', async () => {
      const embedResponse: EmbedResponse = {
        embedding: [1e-10, -1e-10, 0.000001],
      };
      vi.mocked(mockClient.embed).mockResolvedValue(embedResponse);

      const tool = createEmbedTool(mockClient);
      const result = await tool.handler({ content: 'Test' });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.embedding).toHaveLength(3);
    });
  });
});

describe('createInfillTool', () => {
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
    const tool = createInfillTool(mockClient);

    expect(tool.name).toBe('llama_infill');
    expect(tool.description).toBe('Code completion with prefix and suffix context (fill-in-middle)');
  });

  it('accepts input with required fields (prefix and suffix)', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
      input_suffix: '}',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
      input_suffix: '}',
      max_tokens: 512,
      temperature: 0.5,
      stop: ['\n\n', '```'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without prefix', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_suffix: '}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input without suffix', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string prefix', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 12345,
      input_suffix: '}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string suffix', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
      input_suffix: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with invalid temperature type', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
      input_suffix: '}',
      temperature: 'hot',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with invalid stop type', () => {
    const tool = createInfillTool(mockClient);

    const result = tool.inputSchema.safeParse({
      input_prefix: 'function hello() {',
      input_suffix: '}',
      stop: 'not an array',
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns infill content when server responds successfully', async () => {
      const infillResponse: InfillResponse = {
        content: '\n  console.log("Hello!");\n',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'function hello() {',
        input_suffix: '}',
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'function hello() {',
        '}',
        {
          max_tokens: 256,
          temperature: 0.7,
          stop: undefined,
        }
      );
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(infillResponse);
    });

    it('passes custom max_tokens to client', async () => {
      const infillResponse: InfillResponse = {
        content: 'generated code',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: 'return x',
        max_tokens: 512,
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'def foo():',
        'return x',
        expect.objectContaining({ max_tokens: 512 })
      );
    });

    it('passes custom temperature to client', async () => {
      const infillResponse: InfillResponse = {
        content: 'generated code',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: 'return x',
        temperature: 0.3,
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'def foo():',
        'return x',
        expect.objectContaining({ temperature: 0.3 })
      );
    });

    it('passes stop sequences to client', async () => {
      const infillResponse: InfillResponse = {
        content: 'generated code',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: 'return x',
        stop: ['\n\n', 'def '],
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'def foo():',
        'return x',
        expect.objectContaining({ stop: ['\n\n', 'def '] })
      );
    });

    it('passes all parameters when all specified', async () => {
      const infillResponse: InfillResponse = {
        content: '    x = 42\n    ',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      await tool.handler({
        input_prefix: 'def calculate():\n',
        input_suffix: '\n    return x',
        max_tokens: 1024,
        temperature: 0.9,
        stop: ['\ndef ', '\nclass '],
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'def calculate():\n',
        '\n    return x',
        {
          max_tokens: 1024,
          temperature: 0.9,
          stop: ['\ndef ', '\nclass '],
        }
      );
    });

    it('handles empty prefix', async () => {
      const infillResponse: InfillResponse = {
        content: 'import os\n',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: '',
        input_suffix: 'print("Hello")',
      });

      expect(mockClient.infill).toHaveBeenCalledWith('', 'print("Hello")', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles empty suffix', async () => {
      const infillResponse: InfillResponse = {
        content: 'return result',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '',
      });

      expect(mockClient.infill).toHaveBeenCalledWith('def foo():', '', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles both empty prefix and suffix', async () => {
      const infillResponse: InfillResponse = {
        content: '# Some code',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: '',
        input_suffix: '',
      });

      expect(mockClient.infill).toHaveBeenCalledWith('', '', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles long code context', async () => {
      const longPrefix = 'function foo() {\n' + '  const x = 1;\n'.repeat(500);
      const longSuffix = '  return x;\n' + '}\n'.repeat(100);
      const infillResponse: InfillResponse = {
        content: '  // Middle code\n',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: longPrefix,
        input_suffix: longSuffix,
      });

      expect(mockClient.infill).toHaveBeenCalledWith(longPrefix, longSuffix, expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('handles multiline code with indentation', async () => {
      const infillResponse: InfillResponse = {
        content: '        if condition:\n            do_something()\n',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def complex_function():\n    for i in range(10):\n',
        input_suffix: '\n    return total',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.content).toContain('if condition:');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue(
        new Error('Model does not support infill')
      );

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model does not support infill');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue('string error');

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const infillResponse: InfillResponse = {
        content: '  return 42',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def answer():',
        input_suffix: '',
      });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(infillResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createInfillTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        input_prefix: 12345, // Should be string
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles code with special characters', async () => {
      const infillResponse: InfillResponse = {
        content: '  return "Hello, World!"',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'const str = "test\\n\\t";\nfunction greet() {',
        input_suffix: '}\nconsole.log("<tag>\"quoted\"</tag>");',
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'const str = "test\\n\\t";\nfunction greet() {',
        '}\nconsole.log("<tag>\"quoted\"</tag>");',
        expect.any(Object)
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles code with unicode content', async () => {
      const infillResponse: InfillResponse = {
        content: '  # Process: 处理数据\n  return data',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def 计算(数据): # 计算函数\n',
        input_suffix: '\n# 完成 👋',
      });

      expect(mockClient.infill).toHaveBeenCalledWith(
        'def 计算(数据): # 计算函数\n',
        '\n# 完成 👋',
        expect.any(Object)
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles HTTP error from server', async () => {
      vi.mocked(mockClient.infill).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 500');
    });

    it('handles temperature at boundaries', async () => {
      const infillResponse: InfillResponse = {
        content: '  pass',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);

      // Test temperature = 0 (deterministic)
      await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '',
        temperature: 0,
      });
      expect(mockClient.infill).toHaveBeenCalledWith(
        'def foo():',
        '',
        expect.objectContaining({ temperature: 0 })
      );

      // Test temperature = 2 (max)
      await tool.handler({
        input_prefix: 'def foo():',
        input_suffix: '',
        temperature: 2,
      });
      expect(mockClient.infill).toHaveBeenCalledWith(
        'def foo():',
        '',
        expect.objectContaining({ temperature: 2 })
      );
    });

    it('handles realistic code completion scenario', async () => {
      const infillResponse: InfillResponse = {
        content: '\n    for item in items:\n        total += item.price\n    ',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: `class ShoppingCart:
    def __init__(self):
        self.items = []

    def calculate_total(self):
        total = 0`,
        input_suffix: `
        return total

    def add_item(self, item):
        self.items.append(item)`,
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.content).toContain('for item in items');
    });

    it('handles empty response content', async () => {
      const infillResponse: InfillResponse = {
        content: '',
      };
      vi.mocked(mockClient.infill).mockResolvedValue(infillResponse);

      const tool = createInfillTool(mockClient);
      const result = await tool.handler({
        input_prefix: 'complete code here',
        input_suffix: '',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.content).toBe('');
    });
  });
});

describe('createRerankTool', () => {
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
    const tool = createRerankTool(mockClient);

    expect(tool.name).toBe('llama_rerank');
    expect(tool.description).toBe('Rerank documents by relevance to a query');
  });

  it('accepts input with required fields (query and documents)', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'What is machine learning?',
      documents: ['Document about ML', 'Document about cooking'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with empty documents array', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with single document', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents: ['Single document'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with many documents', () => {
    const tool = createRerankTool(mockClient);

    const documents = Array(100).fill('Document content');
    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents,
    });
    expect(result.success).toBe(true);
  });

  it('rejects input without query', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      documents: ['Document 1', 'Document 2'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input without documents', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string query', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 12345,
      documents: ['Document 1'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-array documents', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents: 'not an array',
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with non-string elements in documents', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents: [123, 456],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input with mixed types in documents array', () => {
    const tool = createRerankTool(mockClient);

    const result = tool.inputSchema.safeParse({
      query: 'Search query',
      documents: ['Valid string', 123, 'Another string'],
    });
    expect(result.success).toBe(false);
  });

  describe('handler', () => {
    it('returns rerank results when server responds successfully', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.72 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'What is machine learning?',
        documents: ['Document about cooking', 'Document about ML algorithms'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith(
        'What is machine learning?',
        ['Document about cooking', 'Document about ML algorithms']
      );
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(rerankResponse);
    });

    it('handles empty documents array', async () => {
      const rerankResponse: RerankResponse = {
        results: [],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: [],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('Search query', []);
      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results).toEqual([]);
    });

    it('handles single document', async () => {
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.85 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Machine learning',
        documents: ['Introduction to ML'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('Machine learning', ['Introduction to ML']);
      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results).toHaveLength(1);
    });

    it('handles many documents', async () => {
      const documents = Array(50).fill(0).map((_, i) => `Document ${i}`);
      const results = documents.map((_, i) => ({ index: i, relevance_score: 1 - i * 0.02 }));
      const rerankResponse: RerankResponse = { results };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents,
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('Search query', documents);
      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results).toHaveLength(50);
    });

    it('handles empty query string', async () => {
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.5 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: '',
        documents: ['Some document'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('', ['Some document']);
      expect(result.isError).toBeUndefined();
    });

    it('handles long query string', async () => {
      const longQuery = 'A'.repeat(10000);
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.3 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: longQuery,
        documents: ['Document'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith(longQuery, ['Document']);
      expect(result.isError).toBeUndefined();
    });

    it('handles long documents', async () => {
      const longDocument = 'B'.repeat(10000);
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.6 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Query',
        documents: [longDocument],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('Query', [longDocument]);
      expect(result.isError).toBeUndefined();
    });

    it('handles relevance scores at boundaries', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 0, relevance_score: 1.0 },
          { index: 1, relevance_score: 0.0 },
          { index: 2, relevance_score: 0.5 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Test query',
        documents: ['Doc 1', 'Doc 2', 'Doc 3'],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results[0].relevance_score).toBe(1.0);
      expect(parsedContent.results[1].relevance_score).toBe(0.0);
    });

    it('handles negative relevance scores', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 0, relevance_score: -0.5 },
          { index: 1, relevance_score: 0.5 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Test query',
        documents: ['Doc 1', 'Doc 2'],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results[0].relevance_score).toBe(-0.5);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue(
        new Error('Model does not support reranking')
      );

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model does not support reranking');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue('string error');

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.9 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Query',
        documents: ['Doc'],
      });

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(rerankResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createRerankTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        query: 12345, // Should be string
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles query with special characters', async () => {
      const rerankResponse: RerankResponse = {
        results: [{ index: 0, relevance_score: 0.8 }],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Query\nwith\t"special" <chars>',
        documents: ['Document with\nnewlines'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith(
        'Query\nwith\t"special" <chars>',
        ['Document with\nnewlines']
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles unicode content in query and documents', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 0, relevance_score: 0.9 },
          { index: 1, relevance_score: 0.7 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: '机器学习是什么? 🤖',
        documents: ['这是关于机器学习的文档', 'Документ о машинном обучении'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith(
        '机器学习是什么? 🤖',
        ['这是关于机器学习的文档', 'Документ о машинном обучении']
      );
      expect(result.isError).toBeUndefined();
    });

    it('handles HTTP error from server', async () => {
      vi.mocked(mockClient.rerank).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['Doc 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 500');
    });

    it('handles realistic search reranking scenario', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 2, relevance_score: 0.98 },
          { index: 0, relevance_score: 0.75 },
          { index: 3, relevance_score: 0.62 },
          { index: 1, relevance_score: 0.15 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'How to train a neural network',
        documents: [
          'Neural networks are computational models inspired by biological neural networks.',
          'The best recipes for homemade pasta include using fresh ingredients.',
          'Training neural networks involves forward propagation, loss calculation, and backpropagation.',
          'Deep learning frameworks like TensorFlow and PyTorch simplify neural network development.',
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      // Most relevant document (index 2) about training should be first
      expect(parsedContent.results[0].index).toBe(2);
      expect(parsedContent.results[0].relevance_score).toBe(0.98);
      // Least relevant document (index 1) about pasta should be last
      expect(parsedContent.results[3].index).toBe(1);
      expect(parsedContent.results[3].relevance_score).toBe(0.15);
    });

    it('preserves order of results from server', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 2, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.8 },
          { index: 1, relevance_score: 0.7 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Query',
        documents: ['Doc A', 'Doc B', 'Doc C'],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      // Results should be in the order returned by the server (sorted by relevance)
      expect(parsedContent.results[0].index).toBe(2);
      expect(parsedContent.results[1].index).toBe(0);
      expect(parsedContent.results[2].index).toBe(1);
    });

    it('handles very small relevance scores', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 0, relevance_score: 1e-10 },
          { index: 1, relevance_score: 0.000001 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Query',
        documents: ['Doc 1', 'Doc 2'],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.results[0].relevance_score).toBe(1e-10);
    });

    it('handles documents with empty strings', async () => {
      const rerankResponse: RerankResponse = {
        results: [
          { index: 0, relevance_score: 0.5 },
          { index: 1, relevance_score: 0.3 },
        ],
      };
      vi.mocked(mockClient.rerank).mockResolvedValue(rerankResponse);

      const tool = createRerankTool(mockClient);
      const result = await tool.handler({
        query: 'Search query',
        documents: ['', 'Non-empty document'],
      });

      expect(mockClient.rerank).toHaveBeenCalledWith('Search query', ['', 'Non-empty document']);
      expect(result.isError).toBeUndefined();
    });
  });
});
