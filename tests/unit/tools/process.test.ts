/**
 * Tests for src/tools/process.ts
 *
 * Tests: llama_start, llama_stop
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStartTool, createStopTool, createProcessState, type ProcessState } from '../../../src/tools/process.js';
import type { LlamaClient } from '../../../src/client.js';
import type { Config } from '../../../src/config.js';
import type { ChildProcess } from 'child_process';
import type { HealthResponse } from '../../../src/types.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

describe('createProcessState', () => {
  it('creates initial state with null values', () => {
    const state = createProcessState();

    expect(state.process).toBeNull();
    expect(state.pid).toBeNull();
  });
});

describe('createStartTool', () => {
  let mockClient: LlamaClient;
  let mockConfig: Config;
  let state: ProcessState;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockConfig = {
      serverUrl: 'http://localhost:8080',
      timeout: 30000,
      serverPath: '/usr/bin/llama-server',
    };

    state = createProcessState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates tool with correct name and description', () => {
    const tool = createStartTool(mockClient, mockConfig, state);

    expect(tool.name).toBe('llama_start');
    expect(tool.description).toBe('Start llama-server as a child process with the specified model');
  });

  it('has correct input schema with required model', () => {
    const tool = createStartTool(mockClient, mockConfig, state);

    // Model is required
    const resultMissingModel = tool.inputSchema.safeParse({});
    expect(resultMissingModel.success).toBe(false);

    // Model provided is valid
    const resultWithModel = tool.inputSchema.safeParse({
      model: '/path/to/model.gguf',
    });
    expect(resultWithModel.success).toBe(true);
  });

  it('accepts all optional parameters', () => {
    const tool = createStartTool(mockClient, mockConfig, state);

    const result = tool.inputSchema.safeParse({
      model: '/path/to/model.gguf',
      port: 8081,
      ctx_size: 4096,
      n_gpu_layers: 32,
      threads: 8,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe('/path/to/model.gguf');
      expect(result.data.port).toBe(8081);
      expect(result.data.ctx_size).toBe(4096);
      expect(result.data.n_gpu_layers).toBe(32);
      expect(result.data.threads).toBe(8);
    }
  });

  it('applies default values for optional parameters', () => {
    const tool = createStartTool(mockClient, mockConfig, state);

    const result = tool.inputSchema.safeParse({
      model: '/path/to/model.gguf',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe(8080);
      expect(result.data.ctx_size).toBe(2048);
      expect(result.data.n_gpu_layers).toBe(-1);
      expect(result.data.threads).toBeUndefined();
    }
  });

  describe('handler', () => {
    it('returns error when server is already running', async () => {
      // Set state to indicate server is running
      state.process = {} as ChildProcess;
      state.pid = 12345;

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({ model: '/path/to/model.gguf' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already running');
      expect(result.content[0].text).toContain('12345');
      expect(result.content[0].text).toContain('llama_stop');
    });

    it('returns error when spawn fails (no PID)', async () => {
      const mockProcess = {
        pid: undefined,
        on: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({ model: '/path/to/model.gguf' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to start');
      expect(result.content[0].text).toContain(mockConfig.serverPath);
    });

    it('returns error when server does not become healthy', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Health check always throws (server never becomes ready)
      vi.mocked(mockClient.health).mockRejectedValue(new Error('Connection refused'));

      const tool = createStartTool(mockClient, mockConfig, state);

      // Override waitForHealth's maxAttempts via the test
      // The actual implementation uses 30 attempts with 1s delay, but we don't want to wait that long
      // We'll mock the health to fail a few times
      let callCount = 0;
      vi.mocked(mockClient.health).mockImplementation(async () => {
        callCount++;
        if (callCount >= 30) {
          // After max attempts, we should get the timeout error
        }
        throw new Error('Connection refused');
      });

      // For this test, we need to reduce the wait time
      // Since we can't easily mock setTimeout, we'll verify the error path differently
      // by mocking health to always fail

      const result = await tool.handler({ model: '/path/to/model.gguf' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('did not become healthy');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(state.process).toBeNull();
      expect(state.pid).toBeNull();
    }, 60000); // Increase timeout since we're actually waiting

    it('returns success when server starts and becomes healthy', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Health check succeeds immediately
      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({
        model: '/path/to/model.gguf',
        port: 8081,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.status).toBe('started');
      expect(parsedContent.pid).toBe(12345);
      expect(parsedContent.model).toBe('/path/to/model.gguf');
      expect(parsedContent.port).toBe(8081);

      // Verify state was updated
      expect(state.process).toBe(mockProcess);
      expect(state.pid).toBe(12345);
    });

    it('waits for server loading model before reporting healthy', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      // First call returns loading_model, second returns ok
      let callCount = 0;
      vi.mocked(mockClient.health).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            status: 'loading_model',
            slots_idle: 0,
            slots_processing: 0,
          };
        }
        return {
          status: 'ok',
          slots_idle: 2,
          slots_processing: 0,
        };
      });

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({ model: '/path/to/model.gguf' });

      expect(result.isError).toBeUndefined();
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('spawns llama-server with correct arguments', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createStartTool(mockClient, mockConfig, state);
      await tool.handler({
        model: '/path/to/model.gguf',
        port: 8081,
        ctx_size: 4096,
        n_gpu_layers: 32,
        threads: 8,
      });

      expect(spawn).toHaveBeenCalledWith(
        mockConfig.serverPath,
        [
          '-m', '/path/to/model.gguf',
          '--port', '8081',
          '-c', '4096',
          '-ngl', '32',
          '-t', '8',
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        })
      );
    });

    it('spawns without threads argument when not provided', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createStartTool(mockClient, mockConfig, state);
      await tool.handler({
        model: '/path/to/model.gguf',
      });

      expect(spawn).toHaveBeenCalledWith(
        mockConfig.serverPath,
        [
          '-m', '/path/to/model.gguf',
          '--port', '8080',
          '-c', '2048',
          '-ngl', '-1',
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        })
      );
    });

    it('clears state when process exits', async () => {
      let exitHandler: (() => void) | undefined;

      const mockProcess = {
        pid: 12345,
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'exit') {
            exitHandler = handler;
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createStartTool(mockClient, mockConfig, state);
      await tool.handler({ model: '/path/to/model.gguf' });

      // Verify state was set
      expect(state.process).toBe(mockProcess);
      expect(state.pid).toBe(12345);

      // Simulate process exit
      expect(exitHandler).toBeDefined();
      exitHandler!();

      // Verify state was cleared
      expect(state.process).toBeNull();
      expect(state.pid).toBeNull();
    });

    it('handles Zod validation errors gracefully', async () => {
      const tool = createStartTool(mockClient, mockConfig, state);

      // Pass invalid type for model
      const result = await tool.handler({
        model: 12345, // Should be string
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('handles non-Error exceptions', async () => {
      vi.mocked(spawn).mockImplementation(() => {
        throw 'string error';
      });

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({ model: '/path/to/model.gguf' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('formats JSON output with proper indentation', async () => {
      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const healthResponse: HealthResponse = {
        status: 'ok',
        slots_idle: 2,
        slots_processing: 0,
      };
      vi.mocked(mockClient.health).mockResolvedValue(healthResponse);

      const tool = createStartTool(mockClient, mockConfig, state);
      const result = await tool.handler({ model: '/path/to/model.gguf' });

      // Check that output is formatted with 2-space indentation
      const expectedContent = {
        status: 'started',
        pid: 12345,
        model: '/path/to/model.gguf',
        port: 8080,
      };
      const expectedText = JSON.stringify(expectedContent, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });
  });
});

describe('createStopTool', () => {
  let state: ProcessState;

  beforeEach(() => {
    vi.clearAllMocks();
    state = createProcessState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates tool with correct name and description', () => {
    const tool = createStopTool(state);

    expect(tool.name).toBe('llama_stop');
    expect(tool.description).toBe('Stop the running llama-server process');
  });

  it('has empty input schema (no parameters)', () => {
    const tool = createStopTool(state);

    // Empty object should be valid
    const result = tool.inputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  describe('handler', () => {
    it('returns error when server is not running (null process)', async () => {
      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not running');
      expect(result.content[0].text).toContain('Nothing to stop');
    });

    it('returns error when server is not running (null pid)', async () => {
      state.process = {} as ChildProcess;
      state.pid = null;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not running');
    });

    it('stops running server and clears state', async () => {
      const mockProcess = {
        pid: 12345,
        kill: vi.fn(),
      } as unknown as ChildProcess;

      state.process = mockProcess;
      state.pid = 12345;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(state.process).toBeNull();
      expect(state.pid).toBeNull();
    });

    it('returns success response with stopped PID', async () => {
      const mockProcess = {
        pid: 12345,
        kill: vi.fn(),
      } as unknown as ChildProcess;

      state.process = mockProcess;
      state.pid = 12345;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.status).toBe('stopped');
      expect(parsedContent.pid).toBe(12345);
    });

    it('formats JSON output with proper indentation', async () => {
      const mockProcess = {
        pid: 54321,
        kill: vi.fn(),
      } as unknown as ChildProcess;

      state.process = mockProcess;
      state.pid = 54321;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      // Check that output is formatted with 2-space indentation
      const expectedContent = {
        status: 'stopped',
        pid: 54321,
      };
      const expectedText = JSON.stringify(expectedContent, null, 2);
      expect(result.content[0].text).toBe(expectedText);
    });

    it('handles kill throwing an error', async () => {
      const mockProcess = {
        pid: 12345,
        kill: vi.fn().mockImplementation(() => {
          throw new Error('ESRCH: process already exited');
        }),
      } as unknown as ChildProcess;

      state.process = mockProcess;
      state.pid = 12345;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('ESRCH');
    });

    it('handles non-Error exceptions', async () => {
      const mockProcess = {
        pid: 12345,
        kill: vi.fn().mockImplementation(() => {
          throw 'string error';
        }),
      } as unknown as ChildProcess;

      state.process = mockProcess;
      state.pid = 12345;

      const tool = createStopTool(state);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });
  });
});
