# llama-mcp-server

MCP server bridging Claude Code to local llama.cpp. Run local LLMs alongside Claude for experimentation, testing, and cost-effective inference.

## Requirements

- Node.js 18+
- [llama.cpp](https://github.com/ggerganov/llama.cpp) with `llama-server` built
- A GGUF model file

## Installation

```bash
npm install llama-mcp-server
```

Or clone and build from source:

```bash
git clone https://github.com/ahays248/llama-mcp-server
cd llama-mcp-server
npm install
npm run build
```

## Configuration

Configure via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLAMA_SERVER_URL` | URL of llama-server | `http://localhost:8080` |
| `LLAMA_SERVER_TIMEOUT` | Request timeout in ms | `30000` |
| `LLAMA_MODEL_PATH` | Path to GGUF model file | (none) |
| `LLAMA_SERVER_PATH` | Path to llama-server binary | `llama-server` |

## Usage with Claude Code

Add to your Claude Code MCP configuration (`~/.claude/claude_desktop_config.json` or similar):

```json
{
  "mcpServers": {
    "llama": {
      "command": "npx",
      "args": ["-y", "llama-mcp-server"],
      "env": {
        "LLAMA_SERVER_URL": "http://localhost:8080",
        "LLAMA_MODEL_PATH": "/path/to/your/model.gguf",
        "LLAMA_SERVER_PATH": "/path/to/llama-server"
      }
    }
  }
}
```

## Tools

### Server Tools

| Tool | Description |
|------|-------------|
| `llama_health` | Check if llama-server is running and get status |
| `llama_props` | Get or set server properties |
| `llama_models` | List available/loaded models |
| `llama_slots` | View current slot processing state |
| `llama_metrics` | Get Prometheus-compatible metrics |

### Token Tools

| Tool | Description |
|------|-------------|
| `llama_tokenize` | Convert text to token IDs |
| `llama_detokenize` | Convert token IDs back to text |
| `llama_apply_template` | Format chat messages using model's template |

### Inference Tools

| Tool | Description |
|------|-------------|
| `llama_complete` | Generate text completion from a prompt |
| `llama_chat` | Chat completion (OpenAI-compatible) |
| `llama_embed` | Generate embeddings for text |
| `llama_infill` | Code completion with prefix and suffix context |
| `llama_rerank` | Rerank documents by relevance to a query |

### Model Management Tools

| Tool | Description |
|------|-------------|
| `llama_load_model` | Load a model (router mode only) |
| `llama_unload_model` | Unload the current model (router mode only) |

### LoRA Tools

| Tool | Description |
|------|-------------|
| `llama_lora_list` | List loaded LoRA adapters |
| `llama_lora_set` | Set LoRA adapter scales |

### Process Control Tools

| Tool | Description |
|------|-------------|
| `llama_start` | Start llama-server as a child process |
| `llama_stop` | Stop the llama-server process |

## Example: Starting llama-server and Running Inference

```
User: Start llama-server with my local model

Claude: I'll start llama-server for you.
[Uses llama_start tool with model path]

User: Generate a haiku about coding

Claude: Let me use the local model for that.
[Uses llama_complete tool]

Result:
Lines of code cascade
Through the silent morning hours
Bugs flee from the light
```

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Watch mode for development
npm run dev
```

## License

MIT
