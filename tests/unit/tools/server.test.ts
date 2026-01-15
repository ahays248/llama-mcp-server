/**
 * Tests for src/tools/server.ts
 *
 * Tests: llama_health, llama_props, llama_models, llama_slots, llama_metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHealthTool, createPropsTool, createModelsTool, createSlotsTool, createMetricsTool } from '../../../src/tools/server.js';
import type { LlamaClient } from '../../../src/client.js';
import type { HealthResponse, PropsResponse, ModelsResponse, SlotsResponse } from '../../../src/types.js';

describe('createHealthTool', () => {
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
    const tool = createHealthTool(mockClient);

    expect(tool.name).toBe('llama_health');
    expect(tool.description).toBe('Check if llama-server is running and get status');
  });

  it('has empty input schema', () => {
    const tool = createHealthTool(mockClient);

    // Validate that empty object is valid input
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns health status when server responds with ok', async () => {
      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(healthResponse);
    });

    it('returns health status when server is loading model', async () => {
      const healthResponse: HealthResponse = {
        status: 'loading_model',
        slots_idle: 0,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.status).toBe('loading_model');
    });

    it('returns health status when server reports error', async () => {
      const healthResponse: HealthResponse = {
        status: 'error',
        slots_idle: 0,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.status).toBe('error');
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.health).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.health).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.health).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.health).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.health).mockRejectedValue('string error');

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 4,
        slots_processing: 2,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createHealthTool(mockClient);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(healthResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });
  });
});

describe('createPropsTool', () => {
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
    const tool = createPropsTool(mockClient);

    expect(tool.name).toBe('llama_props');
    expect(tool.description).toBe('Get or set server properties and default generation settings');
  });

  it('accepts empty input for GET request', () => {
    const tool = createPropsTool(mockClient);

    // Validate that empty object is valid input
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts input with default_generation_settings for POST request', () => {
    const tool = createPropsTool(mockClient);

    const result = tool.inputSchema.safeParse({
      default_generation_settings: {
        temperature: 0.8,
        top_p: 0.95,
        top_k: 50,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts additional properties in default_generation_settings via passthrough', () => {
    const tool = createPropsTool(mockClient);

    const result = tool.inputSchema.safeParse({
      default_generation_settings: {
        temperature: 0.8,
        custom_setting: 'value',
        another_number: 42,
      },
    });
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns props when called with empty input (GET)', async () => {
      const propsResponse: PropsResponse = {
        default_generation_settings: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        },
        total_slots: 4,
      };
      vi.mocked(mockClient.props).mockResolvedValue(propsResponse);

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(mockClient.props).toHaveBeenCalledWith(undefined);
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(propsResponse);
    });

    it('updates props when called with settings (POST)', async () => {
      const newSettings = {
        temperature: 0.5,
        top_p: 0.85,
      };
      const propsResponse: PropsResponse = {
        default_generation_settings: newSettings,
        total_slots: 4,
      };
      vi.mocked(mockClient.props).mockResolvedValue(propsResponse);

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({
        default_generation_settings: newSettings,
      });

      expect(mockClient.props).toHaveBeenCalledWith(newSettings);
      expect(result.isError).toBeUndefined();

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.default_generation_settings).toEqual(newSettings);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.props).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.props).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.props).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.props).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.props).mockRejectedValue('string error');

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const propsResponse: PropsResponse = {
        default_generation_settings: {
          temperature: 0.7,
          top_p: 0.9,
        },
        total_slots: 2,
      };
      vi.mocked(mockClient.props).mockResolvedValue(propsResponse);

      const tool = createPropsTool(mockClient);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(propsResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createPropsTool(mockClient);

      // Pass an invalid type that should fail Zod validation
      const result = await tool.handler({
        default_generation_settings: 'not an object',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});

describe('createModelsTool', () => {
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
    const tool = createModelsTool(mockClient);

    expect(tool.name).toBe('llama_models');
    expect(tool.description).toBe('List available/loaded models');
  });

  it('has empty input schema', () => {
    const tool = createModelsTool(mockClient);

    // Validate that empty object is valid input
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns models list in OpenAI-compatible format', async () => {
      const modelsResponse: ModelsResponse = {
        object: 'list',
        data: [
          {
            id: 'hermes-2-pro-7b',
            object: 'model',
            created: 1700000000,
            owned_by: 'local',
          },
        ],
      };
      vi.mocked(mockClient.models).mockResolvedValue(modelsResponse);

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(modelsResponse);
    });

    it('returns models list with multiple models', async () => {
      const modelsResponse: ModelsResponse = {
        object: 'list',
        data: [
          {
            id: 'hermes-2-pro-7b',
            object: 'model',
            created: 1700000000,
            owned_by: 'local',
          },
          {
            id: 'llama-3.2-3b',
            object: 'model',
            created: 1700000001,
            owned_by: 'local',
          },
        ],
      };
      vi.mocked(mockClient.models).mockResolvedValue(modelsResponse);

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.data).toHaveLength(2);
      expect(parsedContent.data[0].id).toBe('hermes-2-pro-7b');
      expect(parsedContent.data[1].id).toBe('llama-3.2-3b');
    });

    it('returns empty models list when no models loaded', async () => {
      const modelsResponse: ModelsResponse = {
        object: 'list',
        data: [],
      };
      vi.mocked(mockClient.models).mockResolvedValue(modelsResponse);

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.object).toBe('list');
      expect(parsedContent.data).toHaveLength(0);
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.models).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.models).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.models).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.models).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.models).mockRejectedValue('string error');

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const modelsResponse: ModelsResponse = {
        object: 'list',
        data: [
          {
            id: 'test-model',
            object: 'model',
            created: 1700000000,
            owned_by: 'local',
          },
        ],
      };
      vi.mocked(mockClient.models).mockResolvedValue(modelsResponse);

      const tool = createModelsTool(mockClient);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(modelsResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });
  });
});

describe('createSlotsTool', () => {
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
    const tool = createSlotsTool(mockClient);

    expect(tool.name).toBe('llama_slots');
    expect(tool.description).toBe('View current slot processing state');
  });

  it('has empty input schema', () => {
    const tool = createSlotsTool(mockClient);

    // Validate that empty object is valid input
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns slots list when server responds', async () => {
      const slotsResponse: SlotsResponse = [
        {
          id: 0,
          state: 'idle',
        },
        {
          id: 1,
          state: 'processing',
        },
      ];
      vi.mocked(mockClient.slots).mockResolvedValue(slotsResponse);

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(slotsResponse);
    });

    it('returns slots with additional metrics', async () => {
      const slotsResponse: SlotsResponse = [
        {
          id: 0,
          state: 'processing',
          prompt_tokens: 128,
          generated_tokens: 45,
          model: 'hermes-2-pro-7b',
        },
      ];
      vi.mocked(mockClient.slots).mockResolvedValue(slotsResponse);

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(1);
      expect(parsedContent[0].id).toBe(0);
      expect(parsedContent[0].state).toBe('processing');
      expect(parsedContent[0].prompt_tokens).toBe(128);
      expect(parsedContent[0].generated_tokens).toBe(45);
    });

    it('returns empty slots list when no slots configured', async () => {
      const slotsResponse: SlotsResponse = [];
      vi.mocked(mockClient.slots).mockResolvedValue(slotsResponse);

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(0);
    });

    it('returns slots with all idle state', async () => {
      const slotsResponse: SlotsResponse = [
        { id: 0, state: 'idle' },
        { id: 1, state: 'idle' },
        { id: 2, state: 'idle' },
        { id: 3, state: 'idle' },
      ];
      vi.mocked(mockClient.slots).mockResolvedValue(slotsResponse);

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(4);
      parsedContent.forEach((slot: { state: string }) => {
        expect(slot.state).toBe('idle');
      });
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.slots).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.slots).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.slots).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.slots).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.slots).mockRejectedValue('string error');

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const slotsResponse: SlotsResponse = [
        {
          id: 0,
          state: 'idle',
        },
        {
          id: 1,
          state: 'processing',
        },
      ];
      vi.mocked(mockClient.slots).mockResolvedValue(slotsResponse);

      const tool = createSlotsTool(mockClient);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedText = JSON.stringify(slotsResponse, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });
  });
});

describe('createMetricsTool', () => {
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
    const tool = createMetricsTool(mockClient);

    expect(tool.name).toBe('llama_metrics');
    expect(tool.description).toBe('Get Prometheus-compatible metrics (tokens processed, latency, etc.)');
  });

  it('has empty input schema', () => {
    const tool = createMetricsTool(mockClient);

    // Validate that empty object is valid input
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns raw Prometheus metrics text when server responds', async () => {
      const metricsResponse = `# HELP llama_tokens_processed Total tokens processed
# TYPE llama_tokens_processed counter
llama_tokens_processed 12345

# HELP llama_prompt_tokens_total Total prompt tokens
# TYPE llama_prompt_tokens_total counter
llama_prompt_tokens_total 8000

# HELP llama_generated_tokens_total Total generated tokens
# TYPE llama_generated_tokens_total counter
llama_generated_tokens_total 4345`;

      vi.mocked(mockClient.metrics).mockResolvedValue(metricsResponse);

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(metricsResponse);
    });

    it('returns metrics with latency and timing information', async () => {
      const metricsResponse = `# HELP llama_request_duration_seconds Request processing time
# TYPE llama_request_duration_seconds histogram
llama_request_duration_seconds_bucket{le="0.1"} 10
llama_request_duration_seconds_bucket{le="0.5"} 25
llama_request_duration_seconds_bucket{le="1.0"} 30
llama_request_duration_seconds_bucket{le="+Inf"} 32
llama_request_duration_seconds_sum 15.5
llama_request_duration_seconds_count 32`;

      vi.mocked(mockClient.metrics).mockResolvedValue(metricsResponse);

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('llama_request_duration_seconds');
      expect(result.content[0].text).toContain('histogram');
    });

    it('returns empty metrics when server has no data', async () => {
      const metricsResponse = '';
      vi.mocked(mockClient.metrics).mockResolvedValue(metricsResponse);

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('');
    });

    it('returns metrics without JSON formatting (raw text)', async () => {
      const metricsResponse = `llama_tokens_total 100`;
      vi.mocked(mockClient.metrics).mockResolvedValue(metricsResponse);

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      // Metrics should be raw text, not JSON
      expect(result.content[0].text).toBe('llama_tokens_total 100');
      expect(() => JSON.parse(result.content[0].text)).toThrow();
    });

    it('returns error with helpful message when connection refused', async () => {
      vi.mocked(mockClient.metrics).mockRejectedValue(
        new Error('fetch failed: ECONNREFUSED')
      );

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to llama-server');
      expect(result.content[0].text).toContain('http://localhost:8080');
      expect(result.content[0].text).toContain('llama_start');
    });

    it('returns error with helpful message on fetch failed', async () => {
      vi.mocked(mockClient.metrics).mockRejectedValue(
        new Error('fetch failed')
      );

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect');
    });

    it('returns error with helpful message on timeout', async () => {
      vi.mocked(mockClient.metrics).mockRejectedValue(
        new Error('The operation was aborted')
      );

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('returns original error message for unknown errors', async () => {
      vi.mocked(mockClient.metrics).mockRejectedValue(
        new Error('Unknown server error')
      );

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server error');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(mockClient.metrics).mockRejectedValue('string error');

      const tool = createMetricsTool(mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });
  });
});
