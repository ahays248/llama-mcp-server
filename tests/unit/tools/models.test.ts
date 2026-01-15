/**
 * Tests for src/tools/models.ts
 *
 * Tests: llama_load_model, llama_unload_model
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLoadModelTool, createUnloadModelTool } from '../../../src/tools/models.js';
import type { LlamaClient } from '../../../src/client.js';

describe('createLoadModelTool', () => {
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
    const tool = createLoadModelTool(mockClient);

    expect(tool.name).toBe('llama_load_model');
    expect(tool.description).toBe('Load a model (router mode only)');
  });

  it('requires model parameter in input schema', () => {
    const tool = createLoadModelTool(mockClient);

    // Empty object should fail validation
    const emptyResult = tool.inputSchema.safeParse({});
    expect(emptyResult.success).toBe(false);

    // Valid model string should pass
    const validResult = tool.inputSchema.safeParse({ model: 'hermes-2-pro-7b' });
    expect(validResult.success).toBe(true);
  });

  it('rejects non-string model parameter', () => {
    const tool = createLoadModelTool(mockClient);

    const result = tool.inputSchema.safeParse({ model: 123 });
    expect(result.success).toBe(false);
  });

  it('accepts model path as string', () => {
    const tool = createLoadModelTool(mockClient);

    const result = tool.inputSchema.safeParse({ model: '/path/to/model.gguf' });
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns success when model loads successfully', async () => {
      vi.mocked(mockClient.loadModel).mockResolvedValue(undefined);

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'hermes-2-pro-7b' });

      expect(mockClient.loadModel).toHaveBeenCalledWith('hermes-2-pro-7b');
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.model).toBe('hermes-2-pro-7b');
      expect(parsedContent.message).toContain('hermes-2-pro-7b');
      expect(parsedContent.message).toContain('loaded successfully');
    });

    it('returns success when loading model by path', async () => {
      vi.mocked(mockClient.loadModel).mockResolvedValue(undefined);

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: '/models/llama-3.2-3b.gguf' });

      expect(mockClient.loadModel).toHaveBeenCalledWith('/models/llama-3.2-3b.gguf');
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.model).toBe('/models/llama-3.2-3b.gguf');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'large-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('Model not found in router')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'missing-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model not found in router');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue('string error');

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('handles HTTP error responses', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('HTTP 404: Not Found')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'nonexistent-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 404');
    });

    it('handles router mode not enabled error', async () => {
      vi.mocked(mockClient.loadModel).mockRejectedValue(
        new Error('HTTP 501: Not Implemented')
      );

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('501');
    });

    it('formats JSON output with proper indentation', async () => {
      vi.mocked(mockClient.loadModel).mockResolvedValue(undefined);

      const tool = createLoadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      // Check that output is formatted with 2-space indentation
      const expectedResponse = {
        success: true,
        model: 'test-model',
        message: 'Model "test-model" loaded successfully',
      };
      const expectedText = JSON.stringify(expectedResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createLoadModelTool(mockClient);

      // Pass invalid input type
      const result = await tool.handler({ model: null });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles missing model parameter', async () => {
      const tool = createLoadModelTool(mockClient);

      // Pass empty object
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});

describe('createUnloadModelTool', () => {
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
    const tool = createUnloadModelTool(mockClient);

    expect(tool.name).toBe('llama_unload_model');
    expect(tool.description).toBe('Unload the current model (router mode only)');
  });

  it('requires model parameter in input schema', () => {
    const tool = createUnloadModelTool(mockClient);

    // Empty object should fail validation
    const emptyResult = tool.inputSchema.safeParse({});
    expect(emptyResult.success).toBe(false);

    // Valid model string should pass
    const validResult = tool.inputSchema.safeParse({ model: 'hermes-2-pro-7b' });
    expect(validResult.success).toBe(true);
  });

  it('rejects non-string model parameter', () => {
    const tool = createUnloadModelTool(mockClient);

    const result = tool.inputSchema.safeParse({ model: 123 });
    expect(result.success).toBe(false);
  });

  it('accepts model path as string', () => {
    const tool = createUnloadModelTool(mockClient);

    const result = tool.inputSchema.safeParse({ model: '/path/to/model.gguf' });
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns success when model unloads successfully', async () => {
      vi.mocked(mockClient.unloadModel).mockResolvedValue(undefined);

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'hermes-2-pro-7b' });

      expect(mockClient.unloadModel).toHaveBeenCalledWith('hermes-2-pro-7b');
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.model).toBe('hermes-2-pro-7b');
      expect(parsedContent.message).toContain('hermes-2-pro-7b');
      expect(parsedContent.message).toContain('unloaded successfully');
    });

    it('returns success when unloading model by path', async () => {
      vi.mocked(mockClient.unloadModel).mockResolvedValue(undefined);

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: '/models/llama-3.2-3b.gguf' });

      expect(mockClient.unloadModel).toHaveBeenCalledWith('/models/llama-3.2-3b.gguf');
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.model).toBe('/models/llama-3.2-3b.gguf');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'large-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('Model not loaded')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'not-loaded-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Model not loaded');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue('string error');

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('handles HTTP error responses', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('HTTP 404: Not Found')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'nonexistent-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 404');
    });

    it('handles router mode not enabled error', async () => {
      vi.mocked(mockClient.unloadModel).mockRejectedValue(
        new Error('HTTP 501: Not Implemented')
      );

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('501');
    });

    it('formats JSON output with proper indentation', async () => {
      vi.mocked(mockClient.unloadModel).mockResolvedValue(undefined);

      const tool = createUnloadModelTool(mockClient);
      const result = await tool.handler({ model: 'test-model' });

      // Check that output is formatted with 2-space indentation
      const expectedResponse = {
        success: true,
        model: 'test-model',
        message: 'Model "test-model" unloaded successfully',
      };
      const expectedText = JSON.stringify(expectedResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createUnloadModelTool(mockClient);

      // Pass invalid input type
      const result = await tool.handler({ model: null });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles missing model parameter', async () => {
      const tool = createUnloadModelTool(mockClient);

      // Pass empty object
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});
