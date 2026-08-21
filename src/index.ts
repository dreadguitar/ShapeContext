import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import { db } from './db';
import routes from './routes/index';
import { setupMCPServer } from './mcp/server';

const app = express();
app.use(cors());
// Setup MCP Server routes before the SPA fallback and express.json()
// This is critical because the MCP SDK consumes req.body as a raw stream in POST /mcp/messages
setupMCPServer(app);

app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve static frontend
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// Fallback for React Router (SPA)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/mcp')) {
    res.sendFile(path.join(clientPath, 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`ShapeContext started on http://localhost:${PORT}`);
  
  // Auto open browser
  try {
    await open(`http://localhost:${PORT}`);
  } catch(e) {}
});
