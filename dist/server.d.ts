/**
 * MCP server setup for llama-mcp-server.
 *
 * Creates and configures the McpServer with all 19 llama.cpp tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LlamaClient } from './client.js';
import type { Config } from './config.js';
import { type ProcessState } from './tools/process.js';
/**
 * Create and configure the MCP server with all tools.
 *
 * @param client - LlamaClient for HTTP communication with llama-server
 * @param config - Configuration settings
 * @returns Configured McpServer instance and process state
 */
export declare function createServer(client: LlamaClient, config: Config): {
    server: McpServer;
    processState: ProcessState;
};
