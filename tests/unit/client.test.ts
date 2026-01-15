/**
 * Tests for src/client.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient, type LlamaClient } from '../../src/client.js';
import type { Config } from '../../src/config.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('createClient', () => {
  const defaultConfig: Config = {
    serverUrl: 'http://localhost:8080',
    timeout: 30000,
    serverPath: 'llama-server',
  };

  let client: LlamaClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createClient(defaultConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates client with correct baseUrl and timeout', () => {
    expect(client.baseUrl).toBe('http://localhost:8080');
    expect(client.timeout).toBe(30000);
  });

  describe('health', () => {
    it('fetches health status from /health endpoint', async () => {
      const healthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(healthResponse),
      });

      const result = await client.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(healthResponse);
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.health()).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('props', () => {
    it('fetches props with GET when no settings provided', async () => {
      const propsResponse = { default_generation_settings: { temperature: 0.7 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(propsResponse),
      });

      const result = await client.props();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/props',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(propsResponse);
    });

    it('updates props with POST when settings provided', async () => {
      const propsResponse = { default_generation_settings: { temperature: 0.5 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(propsResponse),
      });

      const result = await client.props({ temperature: 0.5 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/props',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ default_generation_settings: { temperature: 0.5 } }),
        })
      );
      expect(result).toEqual(propsResponse);
    });
  });

  describe('models', () => {
    it('fetches models from /v1/models endpoint', async () => {
      const modelsResponse = {
        object: 'list',
        data: [{ id: 'hermes-2-pro', object: 'model', created: 1234567890, owned_by: 'local' }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(modelsResponse),
      });

      const result = await client.models();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        expect.any(Object)
      );
      expect(result).toEqual(modelsResponse);
    });
  });

  describe('slots', () => {
    it('fetches slots from /slots endpoint', async () => {
      const slotsResponse = [{ id: 0, state: 'idle' }, { id: 1, state: 'processing' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(slotsResponse),
      });

      const result = await client.slots();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/slots',
        expect.any(Object)
      );
      expect(result).toEqual(slotsResponse);
    });
  });

  describe('metrics', () => {
    it('fetches metrics as text from /metrics endpoint', async () => {
      const metricsText = '# HELP llama_tokens Total tokens\nllama_tokens 1234';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(metricsText),
      });

      const result = await client.metrics();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/metrics',
        expect.any(Object)
      );
      expect(result).toBe(metricsText);
    });
  });

  describe('tokenize', () => {
    it('tokenizes content with default options', async () => {
      const tokenizeResponse = { tokens: [1, 2, 3] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenizeResponse),
      });

      const result = await client.tokenize('hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/tokenize',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'hello world', add_special: true, with_pieces: false }),
        })
      );
      expect(result).toEqual(tokenizeResponse);
    });

    it('tokenizes content with custom options', async () => {
      const tokenizeResponse = { tokens: [1, 2, 3], pieces: ['hel', 'lo', ' world'] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenizeResponse),
      });

      const result = await client.tokenize('hello world', { add_special: false, with_pieces: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/tokenize',
        expect.objectContaining({
          body: JSON.stringify({ content: 'hello world', add_special: false, with_pieces: true }),
        })
      );
      expect(result).toEqual(tokenizeResponse);
    });
  });

  describe('detokenize', () => {
    it('detokenizes tokens to content', async () => {
      const detokenizeResponse = { content: 'hello world' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(detokenizeResponse),
      });

      const result = await client.detokenize([1, 2, 3]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/detokenize',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tokens: [1, 2, 3] }),
        })
      );
      expect(result).toEqual(detokenizeResponse);
    });
  });

  describe('applyTemplate', () => {
    it('applies chat template to messages', async () => {
      const templateResponse = { prompt: '<|user|>\nHello<|assistant|>\n' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(templateResponse),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await client.applyTemplate(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/apply-template',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ messages }),
        })
      );
      expect(result).toEqual(templateResponse);
    });
  });

  describe('complete', () => {
    it('completes prompt with default options', async () => {
      const completionResponse = {
        content: 'world',
        stop: true,
        generation_settings: {},
        timings: { prompt_n: 10, predicted_n: 5 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(completionResponse),
      });

      const result = await client.complete('hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/completion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            prompt: 'hello',
            n_predict: 256,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            stop: undefined,
            seed: undefined,
          }),
        })
      );
      expect(result).toEqual(completionResponse);
    });

    it('completes prompt with custom options', async () => {
      const completionResponse = { content: 'response', stop: true, generation_settings: {}, timings: { prompt_n: 5, predicted_n: 10 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(completionResponse),
      });

      await client.complete('test', {
        max_tokens: 100,
        temperature: 0.5,
        top_p: 0.8,
        top_k: 20,
        stop: ['\n'],
        seed: 42,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/completion',
        expect.objectContaining({
          body: JSON.stringify({
            prompt: 'test',
            n_predict: 100,
            temperature: 0.5,
            top_p: 0.8,
            top_k: 20,
            stop: ['\n'],
            seed: 42,
          }),
        })
      );
    });
  });

  describe('chat', () => {
    it('sends chat messages with default options', async () => {
      const chatResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'hermes',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(chatResponse),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await client.chat(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            messages,
            max_tokens: 256,
            temperature: 0.7,
            top_p: 0.9,
            stop: undefined,
            seed: undefined,
          }),
        })
      );
      expect(result).toEqual(chatResponse);
    });
  });

  describe('embed', () => {
    it('generates embeddings for content', async () => {
      const embedResponse = { embedding: [0.1, 0.2, 0.3] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(embedResponse),
      });

      const result = await client.embed('hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/embedding',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'hello world' }),
        })
      );
      expect(result).toEqual(embedResponse);
    });
  });

  describe('infill', () => {
    it('generates infill between prefix and suffix', async () => {
      const infillResponse = { content: 'return x + y;' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(infillResponse),
      });

      const result = await client.infill('function add(x, y) {', '}');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/infill',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            input_prefix: 'function add(x, y) {',
            input_suffix: '}',
            n_predict: 256,
            temperature: 0.7,
            stop: undefined,
          }),
        })
      );
      expect(result).toEqual(infillResponse);
    });
  });

  describe('rerank', () => {
    it('reranks documents by query relevance', async () => {
      const rerankResponse = {
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.3 },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rerankResponse),
      });

      const result = await client.rerank('cats', ['dogs are great', 'cats are cool']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/reranking',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'cats', documents: ['dogs are great', 'cats are cool'] }),
        })
      );
      expect(result).toEqual(rerankResponse);
    });
  });

  describe('loadModel', () => {
    it('loads a model via POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined),
      });

      await client.loadModel('/models/test.gguf');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/models/load',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: '/models/test.gguf' }),
        })
      );
    });
  });

  describe('unloadModel', () => {
    it('unloads a model via POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined),
      });

      await client.unloadModel('test-model');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/models/unload',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: 'test-model' }),
        })
      );
    });
  });

  describe('loraList', () => {
    it('lists LoRA adapters', async () => {
      const loraResponse = [{ id: 0, path: '/lora/adapter.bin', scale: 1.0 }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loraResponse),
      });

      const result = await client.loraList();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/lora-adapters',
        expect.any(Object)
      );
      expect(result).toEqual(loraResponse);
    });
  });

  describe('loraSet', () => {
    it('updates LoRA adapter scales', async () => {
      const loraResponse = [{ id: 0, path: '/lora/adapter.bin', scale: 0.5 }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loraResponse),
      });

      const result = await client.loraSet([{ id: 0, scale: 0.5 }]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/lora-adapters',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([{ id: 0, scale: 0.5 }]),
        })
      );
      expect(result).toEqual(loraResponse);
    });
  });

  describe('timeout handling', () => {
    it('uses custom timeout from config', () => {
      const customConfig: Config = {
        serverUrl: 'http://localhost:9000',
        timeout: 60000,
        serverPath: 'llama-server',
      };
      const customClient = createClient(customConfig);

      expect(customClient.timeout).toBe(60000);
    });
  });
});
