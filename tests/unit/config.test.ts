/**
 * Tests for src/config.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, type Config } from '../../src/config.js';

describe('loadConfig', () => {
  // Store original env values to restore after tests
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.LLAMA_SERVER_URL;
    delete process.env.LLAMA_SERVER_TIMEOUT;
    delete process.env.LLAMA_MODEL_PATH;
    delete process.env.LLAMA_SERVER_PATH;
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
  });

  it('returns default values when no env vars are set', () => {
    const config = loadConfig();

    expect(config.serverUrl).toBe('http://localhost:8080');
    expect(config.timeout).toBe(30000);
    expect(config.modelPath).toBeUndefined();
    expect(config.serverPath).toBe('llama-server');
  });

  it('reads LLAMA_SERVER_URL from environment', () => {
    process.env.LLAMA_SERVER_URL = 'http://192.168.1.100:9090';

    const config = loadConfig();

    expect(config.serverUrl).toBe('http://192.168.1.100:9090');
  });

  it('reads LLAMA_SERVER_TIMEOUT from environment', () => {
    process.env.LLAMA_SERVER_TIMEOUT = '60000';

    const config = loadConfig();

    expect(config.timeout).toBe(60000);
  });

  it('reads LLAMA_MODEL_PATH from environment', () => {
    process.env.LLAMA_MODEL_PATH = '/models/hermes-2-pro-7b.gguf';

    const config = loadConfig();

    expect(config.modelPath).toBe('/models/hermes-2-pro-7b.gguf');
  });

  it('reads LLAMA_SERVER_PATH from environment', () => {
    process.env.LLAMA_SERVER_PATH = '/usr/local/bin/llama-server';

    const config = loadConfig();

    expect(config.serverPath).toBe('/usr/local/bin/llama-server');
  });

  it('throws on invalid URL', () => {
    process.env.LLAMA_SERVER_URL = 'not-a-valid-url';

    expect(() => loadConfig()).toThrow();
  });

  it('throws on non-positive timeout', () => {
    process.env.LLAMA_SERVER_TIMEOUT = '-1';

    expect(() => loadConfig()).toThrow();
  });

  it('throws on zero timeout', () => {
    process.env.LLAMA_SERVER_TIMEOUT = '0';

    expect(() => loadConfig()).toThrow();
  });

  it('handles all env vars set together', () => {
    process.env.LLAMA_SERVER_URL = 'http://localhost:9000';
    process.env.LLAMA_SERVER_TIMEOUT = '45000';
    process.env.LLAMA_MODEL_PATH = '/models/test.gguf';
    process.env.LLAMA_SERVER_PATH = '/opt/llama/llama-server';

    const config = loadConfig();

    expect(config.serverUrl).toBe('http://localhost:9000');
    expect(config.timeout).toBe(45000);
    expect(config.modelPath).toBe('/models/test.gguf');
    expect(config.serverPath).toBe('/opt/llama/llama-server');
  });
});
