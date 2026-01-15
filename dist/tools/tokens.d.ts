/**
 * Token manipulation tools for llama-mcp-server.
 *
 * Tools: llama_tokenize, llama_detokenize, llama_apply_template
 */
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';
/**
 * Create the llama_tokenize tool.
 *
 * Converts text to token IDs. Optionally includes BOS/EOS tokens
 * and can return the string representation of each token.
 */
export declare function createTokenizeTool(client: LlamaClient): Tool;
/**
 * Create the llama_detokenize tool.
 *
 * Converts token IDs back to text.
 */
export declare function createDetokenizeTool(client: LlamaClient): Tool;
/**
 * Create the llama_apply_template tool.
 *
 * Formats chat messages using the model's template without running inference.
 * Useful for seeing how the chat template formats messages.
 */
export declare function createApplyTemplateTool(client: LlamaClient): Tool;
