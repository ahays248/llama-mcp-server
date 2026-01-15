# Code Conventions

This document defines the code patterns Ralph must follow when implementing tools.

---

## Project Structure

```
src/
├── index.ts          # Entry point (stdio transport setup)
├── server.ts         # McpServer creation, tool registration
├── client.ts         # HTTP client for llama-server
├── config.ts         # Configuration loading from env
├── types.ts          # Shared TypeScript types
└── tools/
    ├── inference.ts  # llama_complete, llama_chat, llama_embed, llama_infill, llama_rerank
    ├── tokens.ts     # llama_tokenize, llama_detokenize, llama_apply_template
    ├── server.ts     # llama_health, llama_props, llama_models, llama_slots, llama_metrics
    ├── models.ts     # llama_load_model, llama_unload_model
    ├── lora.ts       # llama_lora_list, llama_lora_set
    └── process.ts    # llama_start, llama_stop
```

---

## Tool Factory Pattern

Each tool is created via a factory function that accepts dependencies:

```typescript
// src/tools/server.ts
import { z } from 'zod';
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';

export function createHealthTool(client: LlamaClient): Tool {
  return {
    name: 'llama_health',
    description: 'Check if llama-server is running and get status',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const health = await client.health();
        return {
          content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${formatError(message, client.baseUrl)}` }],
          isError: true,
        };
      }
    },
  };
}
```

---

## Tool Type Definition

```typescript
// src/types.ts
import { z } from 'zod';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown) => Promise<ToolResult>;
}
```

---

## HTTP Client Pattern

```typescript
// src/client.ts
export interface LlamaClient {
  baseUrl: string;
  timeout: number;

  // Server endpoints
  health(): Promise<HealthResponse>;
  props(): Promise<PropsResponse>;
  models(): Promise<ModelsResponse>;
  slots(): Promise<SlotsResponse>;
  metrics(): Promise<string>;

  // Token endpoints
  tokenize(content: string, options?: TokenizeOptions): Promise<TokenizeResponse>;
  detokenize(tokens: number[]): Promise<DetokenizeResponse>;
  applyTemplate(messages: ChatMessage[]): Promise<ApplyTemplateResponse>;

  // Inference endpoints
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed(content: string): Promise<EmbedResponse>;
  infill(prefix: string, suffix: string, options?: InfillOptions): Promise<InfillResponse>;
  rerank(query: string, documents: string[]): Promise<RerankResponse>;

  // Model management
  loadModel(model: string): Promise<void>;
  unloadModel(model: string): Promise<void>;

  // LoRA
  loraList(): Promise<LoraAdapter[]>;
  loraSet(adapters: LoraAdapterUpdate[]): Promise<LoraAdapter[]>;
}

export function createClient(config: Config): LlamaClient {
  const baseUrl = config.serverUrl;
  const timeout = config.timeout;

  async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    baseUrl,
    timeout,
    health: () => fetchJson('/health'),
    // ... other methods
  };
}
```

---

## Error Handling

### Rule 1: Never throw from tool handlers

Tool handlers must always return a result, never throw:

```typescript
// CORRECT
handler: async (input) => {
  try {
    const result = await client.complete(input.prompt);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}

// WRONG - will crash the MCP server
handler: async (input) => {
  const result = await client.complete(input.prompt); // throws on error!
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}
```

### Rule 2: Enhance error messages

Transform technical errors into helpful messages:

```typescript
function formatError(message: string, baseUrl: string): string {
  if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
    return `Cannot connect to llama-server at ${baseUrl}. Is it running? Use llama_start or start it manually.`;
  }
  if (message.includes('abort') || message.includes('timeout')) {
    return `Request timed out. Try reducing max_tokens or check server load.`;
  }
  return message;
}
```

---

## Zod Schema Patterns

### Define schemas as constants for reuse:

```typescript
// src/tools/inference.ts
const CompletionInputSchema = z.object({
  prompt: z.string().describe('The prompt to complete'),
  max_tokens: z.number().optional().default(256).describe('Maximum tokens to generate'),
  temperature: z.number().optional().default(0.7).describe('Sampling temperature (0-2)'),
  top_p: z.number().optional().default(0.9).describe('Nucleus sampling threshold'),
  top_k: z.number().optional().default(40).describe('Top-k sampling'),
  stop: z.array(z.string()).optional().describe('Stop sequences'),
  seed: z.number().optional().describe('Random seed for reproducibility'),
});

type CompletionInput = z.infer<typeof CompletionInputSchema>;
```

### Schema descriptions become tool documentation:

The `.describe()` calls are used by Claude to understand parameters. Be concise but clear.

---

## Configuration

```typescript
// src/config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  serverUrl: z.string().url().default('http://localhost:8080'),
  timeout: z.number().positive().default(30000),
  modelPath: z.string().optional(),
  serverPath: z.string().default('llama-server'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    serverUrl: process.env.LLAMA_SERVER_URL ?? 'http://localhost:8080',
    timeout: process.env.LLAMA_SERVER_TIMEOUT
      ? parseInt(process.env.LLAMA_SERVER_TIMEOUT, 10)
      : 30000,
    modelPath: process.env.LLAMA_MODEL_PATH,
    serverPath: process.env.LLAMA_SERVER_PATH ?? 'llama-server',
  });
}
```

---

## Test Patterns

### Unit tests mock the client:

```typescript
// tests/unit/tools/server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHealthTool } from '../../../src/tools/server.js';
import type { LlamaClient } from '../../../src/client.js';

describe('llama_health', () => {
  let mockClient: LlamaClient;

  beforeEach(() => {
    mockClient = {
      baseUrl: 'http://localhost:8080',
      timeout: 30000,
      health: vi.fn(),
    } as unknown as LlamaClient;
  });

  it('returns health status when server responds', async () => {
    vi.mocked(mockClient.health).mockResolvedValue({
      status: 'ok',
      slots_idle: 2,
      slots_processing: 0,
    });

    const tool = createHealthTool(mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('ok');
  });

  it('returns error when server unreachable', async () => {
    vi.mocked(mockClient.health).mockRejectedValue(
      new Error('fetch failed')
    );

    const tool = createHealthTool(mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot connect');
  });
});
```

### Build test validates compilation:

```typescript
// tests/unit/build.test.ts
import { describe, it, expect } from 'vitest';

describe('build', () => {
  it('compiles without errors', async () => {
    // Import the main module to verify it compiles
    const module = await import('../../src/index.js');
    expect(module).toBeDefined();
  });
});
```

---

## Import Conventions

Always use `.js` extension for local imports (required for ES modules):

```typescript
// CORRECT
import { createClient } from './client.js';
import type { Config } from './config.js';

// WRONG - will fail at runtime
import { createClient } from './client';
```

---

## File Header Template

Each source file should start with:

```typescript
/**
 * [Brief description of what this file contains]
 *
 * Tools: [list of tools if applicable]
 */
```

Example:
```typescript
/**
 * Server management tools for llama-mcp-server.
 *
 * Tools: llama_health, llama_props, llama_models, llama_slots, llama_metrics
 */
```
