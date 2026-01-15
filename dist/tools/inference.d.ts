/**
 * Inference tools for llama-mcp-server.
 *
 * Tools: llama_complete, llama_chat, llama_embed, llama_infill, llama_rerank
 */
import type { LlamaClient } from '../client.js';
import type { Tool } from '../types.js';
/**
 * Create the llama_complete tool.
 *
 * Generates text completion from a prompt.
 */
export declare function createCompleteTool(client: LlamaClient): Tool;
/**
 * Create the llama_chat tool.
 *
 * Chat completion using OpenAI-compatible format.
 */
export declare function createChatTool(client: LlamaClient): Tool;
/**
 * Create the llama_embed tool.
 *
 * Generates embeddings for text.
 */
export declare function createEmbedTool(client: LlamaClient): Tool;
/**
 * Create the llama_infill tool.
 *
 * Code completion with prefix and suffix context (fill-in-middle).
 */
export declare function createInfillTool(client: LlamaClient): Tool;
/**
 * Create the llama_rerank tool.
 *
 * Reranks documents by relevance to a query.
 */
export declare function createRerankTool(client: LlamaClient): Tool;
