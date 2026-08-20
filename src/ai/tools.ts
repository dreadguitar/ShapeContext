import { db } from '../db';

export const handleToolCall = (name: string, args: any) => {
  switch (name) {
    case 'create_note': {
      const { title, content, category_id, is_mcp_enabled } = args;
      const info = db.prepare('INSERT INTO notes (title, content, category_id, is_mcp_enabled) VALUES (?, ?, ?, ?)').run(
        title, content, category_id || null, is_mcp_enabled ? 1 : 0
      );
      return db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
    }
    case 'update_note': {
      const { id, title, content, category_id, is_mcp_enabled } = args;
      const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
      if (!current) throw new Error('Note not found');
      
      db.prepare('UPDATE notes SET title = coalesce(?, title), content = coalesce(?, content), category_id = coalesce(?, category_id), is_mcp_enabled = coalesce(?, is_mcp_enabled), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        title, content, category_id, typeof is_mcp_enabled === 'boolean' ? (is_mcp_enabled ? 1 : 0) : current.is_mcp_enabled, id
      );
      return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    }
    case 'delete_note': {
      db.prepare('DELETE FROM notes WHERE id = ?').run(args.id);
      return { success: true };
    }
    case 'search_notes': {
      const query = String(args.query).split(' ').filter(Boolean).map(w => `"${w}"*`).join(' AND ');
      return db.prepare(`SELECT n.id, n.title, n.content FROM notes_fts f JOIN notes n ON f.rowid = n.id WHERE notes_fts MATCH ? LIMIT 10`).all(query);
    }
    case 'list_categories': {
      return db.prepare('SELECT * FROM categories').all();
    }
    case 'create_category': {
      const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(args.name);
      return { id: info.lastInsertRowid, name: args.name };
    }
    case 'update_theme': {
      const { mode, colors_json } = args;
      db.transaction(() => {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(mode, 'theme_mode');
        if (colors_json) {
          db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(colors_json, 'theme_custom');
        }
      })();
      return { success: true, mode, colors_json };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};
