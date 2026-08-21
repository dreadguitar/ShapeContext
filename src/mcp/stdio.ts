#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServerInstance } from "./instance";

async function runStdioServer() {
  // Create an independent instance of the MCP Server
  const server = createMCPServerInstance();

  // Connect it directly to standard input/output (no HTTP required)
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}

runStdioServer().catch((error) => {
  console.error("Fatal error running MCP Stdio proxy:", error);
  process.exit(1);
});
