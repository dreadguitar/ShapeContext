import { Express } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPServerInstance } from './instance';

export function setupMCPServer(app: Express) {
  // Store transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  app.get('/mcp/sse', async (req, res) => {
    // 1. Create a new server instance PER connection
    const mcpServer = createMCPServerInstance();
    
    // 2. Create transport
    const transport = new SSEServerTransport('/mcp/messages', res);
    
    // 3. Connect
    await mcpServer.connect(transport);
    
    // 4. Save transport using its auto-generated session ID
    transports.set(transport.sessionId, transport);

    // 5. Cleanup on disconnect
    res.on('close', async () => {
      transports.delete(transport.sessionId);
      try {
        await mcpServer.close();
      } catch (e) {
        // Ignore close errors if already disconnected
      }
    });
  });

  app.post('/mcp/messages', async (req, res) => {
    // Extract sessionId from query string (e.g., ?sessionId=123...)
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (transport) {
      try {
        await transport.handlePostMessage(req, res);
      } catch (error) {
        console.error("Error handling MCP post message:", error);
        if (!res.headersSent) {
          res.status(500).send("Internal Server Error processing MCP message");
        }
      }
    } else {
      res.status(404).send('Session not found or expired');
    }
  });
}
