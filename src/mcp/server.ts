import { Express } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { db } from '../db';

export function setupMCPServer(app: Express) {
  const mcpServer = new Server({
    name: 'ShapeContext MCP',
    version: '1.0.0'
  }, {
    capabilities: { tools: {} }
  });

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_public_notes',
          description: 'Search through notes that have been made public for MCP.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          }
        },
        {
          name: 'read_public_notes',
          description: 'Get all public notes for MCP.',
          inputSchema: {
            type: 'object',
            properties: {},
          }
        }
      ]
    };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'search_public_notes') {
      const q = request.params.arguments?.query as string;
      if (!q) return { toolResult: { content: [{ type: 'text', text: 'Query required' }] } };
      
      const query = String(q).split(' ').filter(Boolean).map(word => `"${word}"*`).join(' AND ');
      try {
        const notes = db.prepare(`
          SELECT n.title, n.content 
          FROM notes_fts f
          JOIN notes n ON f.rowid = n.id
          WHERE notes_fts MATCH ? AND n.is_mcp_enabled = 1 
          ORDER BY rank
        `).all(query);
        return {
          toolResult: {
            content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }]
          }
        };
      } catch (e) {
        return { toolResult: { content: [{ type: 'text', text: '[]' }] } };
      }
    }

    if (request.params.name === 'read_public_notes') {
      const notes = db.prepare('SELECT title, content FROM notes WHERE is_mcp_enabled = 1').all();
      return {
        toolResult: {
          content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }]
        }
      };
    }

    throw new Error('Tool not found');
  });

  let transport: SSEServerTransport;

  app.get('/mcp/sse', (req, res) => {
    transport = new SSEServerTransport('/mcp/messages', res);
    mcpServer.connect(transport);
  });

  app.post('/mcp/messages', (req, res) => {
    if (transport) {
      transport.handlePostMessage(req, res);
    } else {
      res.status(503).send('MCP not initialized');
    }
  });
}
