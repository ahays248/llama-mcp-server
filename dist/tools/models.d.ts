/**
 * Model management tools for llama-mcp-server.
 *
 * Tools: llama_load_model, llama_unload_model
 */
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';
/**
 * Create the llama_load_model tool.
 *
 * Loads a model in router mode. Only works if llama-server was started in router mode.
 * May take time for large models.
 */
export declare function createLoadModelTool(client: LlamaClient): Tool;
/**
 * Create the llama_unload_model tool.
 *
 * Unloads the current model (router mode only).
 */
export declare function createUnloadModelTool(client: LlamaClient): Tool;
