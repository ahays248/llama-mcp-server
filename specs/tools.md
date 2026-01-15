# llama-mcp-server Tool Specifications

This document defines all 19 MCP tools. Each tool maps 1:1 to a llama.cpp server endpoint.

---

## Tool Categories

| Category | Tools | File |
|----------|-------|------|
| Inference | llama_complete, llama_chat, llama_embed, llama_infill, llama_rerank | src/tools/inference.ts |
| Tokens | llama_tokenize, llama_detokenize, llama_apply_template | src/tools/tokens.ts |
| Server | llama_health, llama_props, llama_models, llama_slots, llama_metrics | src/tools/server.ts |
| Models | llama_load_model, llama_unload_model | src/tools/models.ts |
| LoRA | llama_lora_list, llama_lora_set | src/tools/lora.ts |
| Process | llama_start, llama_stop | src/tools/process.ts |

---

## Server Tools

### llama_health

**Purpose:** Check if llama-server is running and get status.

**Endpoint:** `GET /health`

**Input Schema:**
```typescript
{} // No parameters
```

**Output:** JSON with server status
```typescript
{
  status: "ok" | "loading_model" | "error",
  slots_idle: number,
  slots_processing: number
}
```

**Error Cases:**
- Connection refused: llama-server not running
- Timeout: Server overloaded

**Implementation Notes:**
- Timeout after 5 seconds
- Return `isError: true` on failure with helpful message

---

### llama_props

**Purpose:** Get or set server properties.

**Endpoint:** `GET /props` or `POST /props`

**Input Schema:**
```typescript
{
  // If empty, GET properties. If provided, POST to update.
  default_generation_settings?: {
    temperature?: number,
    top_p?: number,
    top_k?: number,
    // ... other settings
  }
}
```

**Output:** Current server properties including default generation settings.

**Implementation Notes:**
- POST requires llama-server started with `--props` flag
- Return current props after update

---

### llama_models

**Purpose:** List available/loaded models.

**Endpoint:** `GET /v1/models`

**Input Schema:**
```typescript
{} // No parameters
```

**Output:** OpenAI-compatible model list
```typescript
{
  object: "list",
  data: [{
    id: string,
    object: "model",
    created: number,
    owned_by: string
  }]
}
```

---

### llama_slots

**Purpose:** View current slot processing state.

**Endpoint:** `GET /slots`

**Input Schema:**
```typescript
{} // No parameters
```

**Output:** Array of slot states with metrics per slot.

**Implementation Notes:**
- Useful for monitoring concurrent requests
- Each slot handles one inference request

---

### llama_metrics

**Purpose:** Get Prometheus-compatible metrics.

**Endpoint:** `GET /metrics`

**Input Schema:**
```typescript
{} // No parameters
```

**Output:** Prometheus text format metrics (tokens processed, latency, etc.)

**Implementation Notes:**
- Return raw text, not JSON
- Useful for monitoring/alerting

---

## Token Tools

### llama_tokenize

**Purpose:** Convert text to token IDs.

**Endpoint:** `POST /tokenize`

**Input Schema:**
```typescript
{
  content: z.string().describe("Text to tokenize"),
  add_special: z.boolean().optional().default(true).describe("Add BOS/EOS tokens"),
  with_pieces: z.boolean().optional().default(false).describe("Include token strings")
}
```

**Output:**
```typescript
{
  tokens: number[],
  // If with_pieces: true
  pieces?: string[]
}
```

---

### llama_detokenize

**Purpose:** Convert token IDs back to text.

**Endpoint:** `POST /detokenize`

**Input Schema:**
```typescript
{
  tokens: z.array(z.number()).describe("Token IDs to convert")
}
```

**Output:**
```typescript
{
  content: string
}
```

---

### llama_apply_template

**Purpose:** Format chat messages using model's template without inference.

**Endpoint:** `POST /apply-template`

**Input Schema:**
```typescript
{
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
  })).describe("Chat messages to format")
}
```

**Output:**
```typescript
{
  prompt: string  // Formatted prompt ready for completion
}
```

**Implementation Notes:**
- Useful for seeing how chat template formats messages
- Model must have a chat template defined

---

## Inference Tools

### llama_complete

**Purpose:** Generate text completion from a prompt.

**Endpoint:** `POST /completion`

**Input Schema:**
```typescript
{
  prompt: z.string().describe("The prompt to complete"),
  max_tokens: z.number().optional().default(256).describe("Maximum tokens to generate"),
  temperature: z.number().optional().default(0.7).describe("Sampling temperature"),
  top_p: z.number().optional().default(0.9).describe("Nucleus sampling threshold"),
  top_k: z.number().optional().default(40).describe("Top-k sampling"),
  stop: z.array(z.string()).optional().describe("Stop sequences"),
  seed: z.number().optional().describe("Random seed for reproducibility")
}
```

**Output:**
```typescript
{
  content: string,
  stop: boolean,
  generation_settings: object,
  timings: {
    prompt_n: number,
    predicted_n: number,
    // ...
  }
}
```

**Implementation Notes:**
- Streaming not supported (MCP is request/response)
- Large max_tokens may timeout

---

### llama_chat

**Purpose:** Chat completion (OpenAI-compatible).

**Endpoint:** `POST /v1/chat/completions`

**Input Schema:**
```typescript
{
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
  })).describe("Chat messages"),
  max_tokens: z.number().optional().default(256),
  temperature: z.number().optional().default(0.7),
  top_p: z.number().optional().default(0.9),
  stop: z.array(z.string()).optional(),
  seed: z.number().optional()
}
```

**Output:** OpenAI-compatible chat completion response
```typescript
{
  id: string,
  object: "chat.completion",
  created: number,
  model: string,
  choices: [{
    index: number,
    message: { role: "assistant", content: string },
    finish_reason: "stop" | "length"
  }],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

---

### llama_embed

**Purpose:** Generate embeddings for text.

**Endpoint:** `POST /embedding`

**Input Schema:**
```typescript
{
  content: z.string().describe("Text to embed")
}
```

**Output:**
```typescript
{
  embedding: number[]  // Vector of floats
}
```

**Implementation Notes:**
- Model must support embeddings
- Vector dimension depends on model

---

### llama_infill

**Purpose:** Code completion with prefix and suffix context (fill-in-middle).

**Endpoint:** `POST /infill`

**Input Schema:**
```typescript
{
  input_prefix: z.string().describe("Code before cursor"),
  input_suffix: z.string().describe("Code after cursor"),
  max_tokens: z.number().optional().default(256),
  temperature: z.number().optional().default(0.7),
  stop: z.array(z.string()).optional()
}
```

**Output:**
```typescript
{
  content: string  // Generated code to insert
}
```

**Implementation Notes:**
- Model must support infill (FIM tokens)
- Useful for code completion in editors

---

### llama_rerank

**Purpose:** Rerank documents by relevance to a query.

**Endpoint:** `POST /reranking`

**Input Schema:**
```typescript
{
  query: z.string().describe("Search query"),
  documents: z.array(z.string()).describe("Documents to rerank")
}
```

**Output:**
```typescript
{
  results: [{
    index: number,
    relevance_score: number
  }]
}
```

**Implementation Notes:**
- Model must support reranking
- Returns documents sorted by relevance

---

## Model Management Tools

### llama_load_model

**Purpose:** Load a model (router mode only).

**Endpoint:** `POST /models/load`

**Input Schema:**
```typescript
{
  model: z.string().describe("Model name or path to load")
}
```

**Output:** Success confirmation or error.

**Implementation Notes:**
- Only works if llama-server started in router mode
- May take time for large models

---

### llama_unload_model

**Purpose:** Unload the current model (router mode only).

**Endpoint:** `POST /models/unload`

**Input Schema:**
```typescript
{
  model: z.string().describe("Model to unload")
}
```

**Output:** Success confirmation.

---

## LoRA Tools

### llama_lora_list

**Purpose:** List loaded LoRA adapters.

**Endpoint:** `GET /lora-adapters`

**Input Schema:**
```typescript
{} // No parameters
```

**Output:**
```typescript
[{
  id: number,
  path: string,
  scale: number
}]
```

---

### llama_lora_set

**Purpose:** Set LoRA adapter scales.

**Endpoint:** `POST /lora-adapters`

**Input Schema:**
```typescript
{
  adapters: z.array(z.object({
    id: z.number().describe("Adapter ID"),
    scale: z.number().describe("Scale factor (0 to disable)")
  }))
}
```

**Output:** Updated adapter list.

**Implementation Notes:**
- Scale 0 effectively disables adapter
- Multiple adapters can be active

---

## Process Control Tools

### llama_start

**Purpose:** Start llama-server as a child process.

**Endpoint:** N/A (local process management)

**Input Schema:**
```typescript
{
  model: z.string().describe("Path to GGUF model file"),
  port: z.number().optional().default(8080).describe("Port to listen on"),
  ctx_size: z.number().optional().default(2048).describe("Context size"),
  n_gpu_layers: z.number().optional().default(-1).describe("GPU layers (-1 = all)"),
  threads: z.number().optional().describe("CPU threads")
}
```

**Output:** Process started confirmation with PID.

**Implementation Notes:**
- Spawns llama-server as child process
- Stores PID for later stop
- Waits for /health to return OK before confirming
- Returns error if already running

---

### llama_stop

**Purpose:** Stop the llama-server process.

**Endpoint:** N/A (local process management)

**Input Schema:**
```typescript
{} // No parameters
```

**Output:** Process stopped confirmation.

**Implementation Notes:**
- Sends SIGTERM to stored PID
- Clears stored PID
- Returns error if not running

---

## Common Patterns

### Error Response Format

All tools return errors in this format:
```typescript
{
  content: [{ type: "text", text: "Error: <helpful message>" }],
  isError: true
}
```

### Success Response Format

All tools return success in this format:
```typescript
{
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
}
```

### Common Error Messages

| Situation | Message |
|-----------|---------|
| Server not running | "Cannot connect to llama-server at {url}. Is it running? Use llama_start or start it manually." |
| Timeout | "Request timed out after {ms}ms. Try reducing max_tokens or check server load." |
| No model loaded | "No model loaded. Use llama_load_model or start llama-server with -m flag." |
| Invalid parameters | Zod validation error message |
