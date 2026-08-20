#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function runStdioProxy() {
  // 1. Connect to the underlying ShapeContext Express SSE server
  const transport = new SSEClientTransport(new URL("http://localhost:3000/mcp/sse"));
  const client = new Client({ name: "shapecontext-stdio-proxy", version: "1.0.1" }, { capabilities: {} });
  
  try {
    await client.connect(transport);
  } catch (e) {
    console.error("ShapeContext MCP Proxy Error: Unable to connect to http://localhost:3000/mcp/sse. Make sure ShapeContext is running.");
    process.exit(1);
  }

  // 2. Spin up a local Stdio server for desktop clients (Claude, Cursor, etc)
  const server = new Server({ name: "ShapeContext MCP Proxy", version: "1.0.1" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Delegate to the real SSE server
    return await client.request({ method: "tools/list" }, ListToolsRequestSchema);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Delegate execution to the real SSE server
    return await client.request(
      { method: "tools/call", params: request.params },
      CallToolRequestSchema
    );
  });

  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}

runStdioProxy().catch((error) => {
  console.error("Fatal error running MCP Stdio proxy:", error);
  process.exit(1);
});
