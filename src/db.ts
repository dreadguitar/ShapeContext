import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine the db directory
const homeDir = os.homedir();
const dbDir = path.join(homeDir, '.shapecontext');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER,
    is_mcp_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  -- Create virtual table for full-text search (FTS5)
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    title,
    content,
    content='notes',
    content_rowid='id'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Triggers to keep FTS5 index in sync
db.exec(`
  CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  END;

  CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
    INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
  END;
`);

// Seed default settings if not exists
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('ai_provider', 'openai');
insertSetting.run('ai_base_url', 'https://api.openai.com/v1');
insertSetting.run('ai_api_key', '');
insertSetting.run('ai_model', 'gpt-4o-mini');
insertSetting.run('theme_mode', 'dark');
insertSetting.run('theme_custom', '{}');

// Insert default categories if none
const catCount = db.prepare('SELECT count(*) as c FROM categories').get() as { c: number };
if (catCount.c === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
  insertCat.run('General');
  insertCat.run('Secrets');
  insertCat.run('Reminders');
}

export { db };
