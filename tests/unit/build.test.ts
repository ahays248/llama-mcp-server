/**
 * Build validation tests for llama-mcp-server.
 *
 * These tests verify that all source modules compile correctly
 * by importing them at runtime.
 */

import { describe, it, expect } from 'vitest';

describe('build', () => {
  it('compiles types.ts without errors', async () => {
    const module = await import('../../src/types.js');
    expect(module).toBeDefined();
  });

  it('compiles config.ts without errors', async () => {
    const module = await import('../../src/config.js');
    expect(module).toBeDefined();
    expect(module.loadConfig).toBeTypeOf('function');
  });

  it('compiles client.ts without errors', async () => {
    const module = await import('../../src/client.js');
    expect(module).toBeDefined();
    expect(module.createClient).toBeTypeOf('function');
  });
});
