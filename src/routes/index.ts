import { Router } from 'express';
import { db } from '../db';
import { handleChat } from '../ai/chat';

const router = Router();

// Notes
router.get('/notes', (req, res) => {
  const notes = db.prepare('SELECT n.*, c.name as category_name FROM notes n LEFT JOIN categories c ON n.category_id = c.id ORDER BY n.updated_at DESC').all();
  res.json(notes);
});

router.post('/notes', (req, res) => {
  const { title, content, category_id, is_mcp_enabled } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO notes (title, content, category_id, is_mcp_enabled) VALUES (?, ?, ?, ?)');
    const info = stmt.run(title || 'Nueva Nota', content || '', category_id || null, is_mcp_enabled ? 1 : 0);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
    res.json(note);
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/notes/:id', (req, res) => {
  const { title, content, category_id, is_mcp_enabled } = req.body;
  try {
    const stmt = db.prepare('UPDATE notes SET title = ?, content = ?, category_id = ?, is_mcp_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(title, content, category_id || null, is_mcp_enabled ? 1 : 0, req.params.id);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    res.json(note);
  } catch (error: any) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/notes/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  // FTS5 prefix search: append * to each word
  const query = String(q).split(' ').filter(Boolean).map(word => `"${word}"*`).join(' AND ');
  try {
    const notes = db.prepare(`
      SELECT n.*, c.name as category_name 
      FROM notes_fts f
      JOIN notes n ON f.rowid = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE notes_fts MATCH ? ORDER BY rank
    `).all(query);
    res.json(notes);
  } catch (e) {
    res.json([]);
  }
});

// Categories
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(cats);
});

router.post('/categories', (req, res) => {
  const { name } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const info = stmt.run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Settings
router.get('/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const obj = (settings as any[]).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  res.json(obj);
});

router.put('/settings', (req, res) => {
  const keys = Object.keys(req.body);
  const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  db.transaction(() => {
    for (const key of keys) {
      stmt.run(String(req.body[key]), key);
    }
  })();
  res.json({ success: true });
});

// Dashboard stats
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT count(*) as c FROM notes').get() as {c:number};
  const mcp = db.prepare('SELECT count(*) as c FROM notes WHERE is_mcp_enabled = 1').get() as {c:number};
  const byCategory = db.prepare(`
    SELECT c.name, COUNT(n.id) as count 
    FROM categories c 
    LEFT JOIN notes n ON n.category_id = c.id 
    GROUP BY c.id
  `).all();
  res.json({
    totalNotes: total.c,
    mcpNotes: mcp.c,
    byCategory
  });
});

// AI Chat stream
router.post('/chat', handleChat);

export default router;
