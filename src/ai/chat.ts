import { Request, Response } from 'express';
import OpenAI from 'openai';
import { db } from '../db';
import { handleToolCall } from './tools';

export const handleChat = async (req: Request, res: Response) => {
  const { messages } = req.body;
  
  // Load settings
  const settingsRows = db.prepare('SELECT * FROM settings').all() as any[];
  const settings = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  const apiKey = settings.ai_api_key;
  const baseURL = settings.ai_base_url || 'https://api.openai.com/v1';
  const model = settings.ai_model || 'gpt-4o-mini';

  if (!apiKey && baseURL.includes('openai.com')) {
    res.status(400).json({ error: 'API Key missing for OpenAI' });
    return;
  }

  const openai = new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL
  });

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'create_note',
        description: 'Creates a new note',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            category_id: { type: 'number' },
            is_mcp_enabled: { type: 'boolean' }
          },
          required: ['title', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_note',
        description: 'Updates an existing note',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            content: { type: 'string' },
            category_id: { type: 'number' },
            is_mcp_enabled: { type: 'boolean' }
          },
          required: ['id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_note',
        description: 'Deletes a note',
        parameters: {
          type: 'object',
          properties: { id: { type: 'number' } },
          required: ['id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_notes',
        description: 'Searches across all notes using fast full-text search',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_categories',
        description: 'Lists all available categories',
        parameters: { type: 'object', properties: {} }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_category',
        description: 'Creates a new category',
        parameters: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_theme',
        description: 'Updates the application theme with custom colors',
        parameters: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['dark', 'light', 'custom'] },
            colors_json: { type: 'string', description: 'JSON string with CSS variables mapping to color codes, e.g. {"--background": "#000", "--foreground": "#0f0"}' }
          },
          required: ['mode']
        }
      }
    }
  ];

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let chatMessages = [...messages];

    while (true) {
      const stream = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        tools,
        stream: true
      });

      let toolCalls: any[] = [];
      let currentToolCall: any = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id) {
              currentToolCall = {
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments || ''
              };
              toolCalls.push(currentToolCall);
            } else if (currentToolCall) {
              currentToolCall.arguments += tc.function?.arguments || '';
            }
          }
        }
      }

      if (toolCalls.length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
        break;
      } else {
        res.write(`data: ${JSON.stringify({ type: 'tool_calls', tool_calls: toolCalls })}\n\n`);
        chatMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments }
          }))
        });

        for (const tc of toolCalls) {
          try {
            const args = JSON.parse(tc.arguments);
            const result = handleToolCall(tc.name, args);
            chatMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result)
            });
            res.write(`data: ${JSON.stringify({ type: 'tool_result', id: tc.id, result })}\n\n`);
          } catch (e: any) {
            chatMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ error: e.message })
            });
          }
        }
      }
    }
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
};
