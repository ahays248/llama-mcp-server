/**
 * LoRA adapter management tools for llama-mcp-server.
 *
 * Tools: llama_lora_list, llama_lora_set
 */
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';
/**
 * Create the llama_lora_list tool.
 *
 * Lists all loaded LoRA adapters with their IDs, paths, and scale factors.
 */
export declare function createLoraListTool(client: LlamaClient): Tool;
/**
 * Create the llama_lora_set tool.
 *
 * Sets LoRA adapter scale factors. Scale 0 effectively disables an adapter.
 * Multiple adapters can be active simultaneously.
 */
export declare function createLoraSetTool(client: LlamaClient): Tool;
