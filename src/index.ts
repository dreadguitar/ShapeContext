import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import { db } from './db';
import routes from './routes/index';
import { setupMCPServer } from './mcp/server';

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Setup MCP Server routes before the SPA fallback
setupMCPServer(app);

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
