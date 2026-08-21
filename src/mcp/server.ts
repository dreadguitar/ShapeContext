import { Express } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPServerInstance } from './instance';

export function setupMCPServer(app: Express) {
  const mcpServer = createMCPServerInstance();
  let transport: SSEServerTransport;

  app.get('/mcp/sse', async (req, res) => {
    transport = new SSEServerTransport('/mcp/messages', res);
    await mcpServer.connect(transport);
  });

  app.post('/mcp/messages', async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(503).send('MCP not initialized');
    }
  });
}
