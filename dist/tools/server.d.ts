/**
 * Server management tools for llama-mcp-server.
 *
 * Tools: llama_health, llama_props, llama_models, llama_slots, llama_metrics
 */
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';
/**
 * Create the llama_health tool.
 *
 * Checks if llama-server is running and returns status information.
 */
export declare function createHealthTool(client: LlamaClient): Tool;
/**
 * Create the llama_props tool.
 *
 * Gets or sets server properties. If default_generation_settings is provided,
 * updates the settings via POST. Otherwise returns current settings via GET.
 */
export declare function createPropsTool(client: LlamaClient): Tool;
/**
 * Create the llama_models tool.
 *
 * Lists available/loaded models in OpenAI-compatible format.
 */
export declare function createModelsTool(client: LlamaClient): Tool;
/**
 * Create the llama_slots tool.
 *
 * Views current slot processing state. Each slot handles one inference request.
 * Useful for monitoring concurrent requests.
 */
export declare function createSlotsTool(client: LlamaClient): Tool;
/**
 * Create the llama_metrics tool.
 *
 * Gets Prometheus-compatible metrics from llama-server.
 * Returns raw text format useful for monitoring/alerting.
 */
export declare function createMetricsTool(client: LlamaClient): Tool;
