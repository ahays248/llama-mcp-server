#!/usr/bin/env node
/**
 * Entry point for llama-mcp-server.
 *
 * Sets up the MCP server with stdio transport for communication with Claude Code.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createClient } from './client.js';
import { createServer } from './server.js';

/**
 * Main entry point.
 *
 * Loads configuration, creates the client and server, and connects via stdio.
 */
async function main(): Promise<void> {
  // Load configuration from environment variables
  const config = loadConfig();

  // Create HTTP client for llama-server communication
  const client = createClient(config);

  // Create MCP server with all tools
  const { server } = createServer(client, config);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
