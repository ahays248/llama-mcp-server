/**
 * Tests for src/tools/lora.ts
 *
 * Tests: llama_lora_list, llama_lora_set
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLoraListTool, createLoraSetTool } from '../../../src/tools/lora.js';
import type { LlamaClient } from '../../../src/client.js';

describe('createLoraListTool', () => {
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
    const tool = createLoraListTool(mockClient);

    expect(tool.name).toBe('llama_lora_list');
    expect(tool.description).toBe('List loaded LoRA adapters');
  });

  it('accepts empty object for input schema', () => {
    const tool = createLoraListTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('ignores extra parameters in input schema', () => {
    const tool = createLoraListTool(mockClient);

    const result = tool.inputSchema.safeParse({ extra: 'ignored' });
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns empty array when no adapters loaded', async () => {
      vi.mocked(mockClient.loraList).mockResolvedValue([]);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(mockClient.loraList).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([]);
    });

    it('returns single adapter when one is loaded', async () => {
      const adapters = [
        { id: 0, path: '/models/lora-adapter.bin', scale: 1.0 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(1);
      expect(parsedContent[0].id).toBe(0);
      expect(parsedContent[0].path).toBe('/models/lora-adapter.bin');
      expect(parsedContent[0].scale).toBe(1.0);
    });

    it('returns multiple adapters when several are loaded', async () => {
      const adapters = [
        { id: 0, path: '/models/lora-style.bin', scale: 0.8 },
        { id: 1, path: '/models/lora-task.bin', scale: 1.0 },
        { id: 2, path: '/models/lora-lang.bin', scale: 0.5 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(3);
      expect(parsedContent[0].id).toBe(0);
      expect(parsedContent[1].id).toBe(1);
      expect(parsedContent[2].id).toBe(2);
    });

    it('handles adapters with zero scale (disabled)', async () => {
      const adapters = [
        { id: 0, path: '/models/lora-disabled.bin', scale: 0 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(0);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('LoRA adapters not supported')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('LoRA adapters not supported');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue('string error');

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('handles HTTP error responses', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('HTTP 404: Not Found')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 404');
    });

    it('handles server not configured for LoRA', async () => {
      vi.mocked(mockClient.loraList).mockRejectedValue(
        new Error('HTTP 501: Not Implemented')
      );

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('501');
    });

    it('formats JSON output with proper indentation', async () => {
      const adapters = [
        { id: 0, path: '/models/lora.bin', scale: 1.0 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(adapters, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles adapters with fractional scale values', async () => {
      const adapters = [
        { id: 0, path: '/models/lora.bin', scale: 0.333 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(0.333);
    });

    it('handles adapters with negative scale values', async () => {
      const adapters = [
        { id: 0, path: '/models/lora.bin', scale: -0.5 },
      ];
      vi.mocked(mockClient.loraList).mockResolvedValue(adapters);

      const tool = createLoraListTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(-0.5);
    });
  });
});

describe('createLoraSetTool', () => {
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
    const tool = createLoraSetTool(mockClient);

    expect(tool.name).toBe('llama_lora_set');
    expect(tool.description).toBe('Set LoRA adapter scales');
  });

  it('validates adapters array is required', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('validates adapter objects have id and scale', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 0 }], // missing scale
    });
    expect(result.success).toBe(false);
  });

  it('validates id is a number', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 'not-a-number', scale: 1.0 }],
    });
    expect(result.success).toBe(false);
  });

  it('validates scale is a number', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 0, scale: 'high' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid input with single adapter', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 0, scale: 1.0 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with multiple adapters', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [
        { id: 0, scale: 0.8 },
        { id: 1, scale: 1.0 },
        { id: 2, scale: 0.5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty adapters array', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts zero scale (to disable adapter)', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 0, scale: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts negative scale values', () => {
    const tool = createLoraSetTool(mockClient);

    const result = tool.inputSchema.safeParse({
      adapters: [{ id: 0, scale: -0.5 }],
    });
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('sets single adapter scale and returns updated list', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora.bin', scale: 0.5 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 0.5 }],
      });

      expect(mockClient.loraSet).toHaveBeenCalledWith([{ id: 0, scale: 0.5 }]);
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(1);
      expect(parsedContent[0].scale).toBe(0.5);
    });

    it('sets multiple adapter scales', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora-style.bin', scale: 0.8 },
        { id: 1, path: '/models/lora-task.bin', scale: 1.0 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [
          { id: 0, scale: 0.8 },
          { id: 1, scale: 1.0 },
        ],
      });

      expect(mockClient.loraSet).toHaveBeenCalledWith([
        { id: 0, scale: 0.8 },
        { id: 1, scale: 1.0 },
      ]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(2);
    });

    it('disables adapter by setting scale to zero', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora.bin', scale: 0 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 0 }],
      });

      expect(mockClient.loraSet).toHaveBeenCalledWith([{ id: 0, scale: 0 }]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(0);
    });

    it('handles empty adapters array', async () => {
      vi.mocked(mockClient.loraSet).mockResolvedValue([]);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [],
      });

      expect(mockClient.loraSet).toHaveBeenCalledWith([]);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([]);
    });

    it('returns error when adapters array is missing', async () => {
      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('returns error when adapter id is missing', async () => {
      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('returns error when adapter scale is missing', async () => {
      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('Adapter ID not found')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 999, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Adapter ID not found');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue('string error');

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('handles HTTP error responses', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('HTTP 400: Bad Request')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP 400');
    });

    it('handles server not configured for LoRA', async () => {
      vi.mocked(mockClient.loraSet).mockRejectedValue(
        new Error('HTTP 501: Not Implemented')
      );

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 1.0 }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('501');
    });

    it('formats JSON output with proper indentation', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora.bin', scale: 0.5 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 0.5 }],
      });

      const expectedText = JSON.stringify(updatedAdapters, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles fractional scale values', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora.bin', scale: 0.333 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: 0.333 }],
      });

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(0.333);
    });

    it('handles negative scale values', async () => {
      const updatedAdapters = [
        { id: 0, path: '/models/lora.bin', scale: -0.5 },
      ];
      vi.mocked(mockClient.loraSet).mockResolvedValue(updatedAdapters);

      const tool = createLoraSetTool(mockClient);
      const result = await tool.handler({
        adapters: [{ id: 0, scale: -0.5 }],
      });

      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].scale).toBe(-0.5);
    });
  });
});
