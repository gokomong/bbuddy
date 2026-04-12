import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { homedir } from 'os';

const bbddyDir = path.join(homedir(), '.bbddy');
mkdirSync(bbddyDir, { recursive: true });
const dbPath = path.join(bbddyDir, 'bbddy.db');

// Migrate from old ~/.buddy/buddy.db if it exists and new DB doesn't
const oldDbPath = path.join(homedir(), '.buddy', 'buddy.db');
if (!existsSync(dbPath) && existsSync(oldDbPath)) {
  try { copyFileSync(oldDbPath, dbPath); } catch { /* non-fatal */ }
}

export const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      mood TEXT DEFAULT 'happy',
      personality_bio TEXT DEFAULT '',
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      companion_id TEXT,
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 1,
      tag TEXT,
      metadata TEXT,
      is_consolidated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(companion_id) REFERENCES companions(id)
    );

    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY,
      companion_id TEXT,
      event_type TEXT NOT NULL,
      xp_gained INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(companion_id) REFERENCES companions(id)
    );

    CREATE TABLE IF NOT EXISTS evolution_history (
      id TEXT PRIMARY KEY,
      companion_id TEXT,
      from_level INTEGER NOT NULL,
      to_level INTEGER NOT NULL,
      from_species TEXT NOT NULL,
      to_species TEXT NOT NULL,
      is_shiny INTEGER DEFAULT 0,
      is_mutation INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(companion_id) REFERENCES companions(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      companion_id TEXT,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      context_summary TEXT,
      FOREIGN KEY(companion_id) REFERENCES companions(id)
    );

    CREATE TABLE IF NOT EXISTS custom_sprites (
      companion_id  TEXT PRIMARY KEY,
      idle_frames   TEXT NOT NULL,
      happy_frame   TEXT,
      sad_frame     TEXT,
      working_frame TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(companion_id) REFERENCES companions(id)
    );

    CREATE TABLE IF NOT EXISTS companion_slots (
      slot_name      TEXT PRIMARY KEY,
      companion_data TEXT NOT NULL,
      custom_sprite  TEXT,
      saved_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // bbddy schema migrations — safe to run on existing DBs
  const cols = db.pragma('table_info(companions)') as any[];
  const colNames = new Set(cols.map((c: any) => c.name));
  if (!colNames.has('creation_mode')) {
    db.exec(`
      ALTER TABLE companions ADD COLUMN creation_mode TEXT DEFAULT 'hatched';
      ALTER TABLE companions ADD COLUMN personality_preset TEXT DEFAULT NULL;
      ALTER TABLE companions ADD COLUMN custom_prompt TEXT DEFAULT NULL;
      ALTER TABLE companions ADD COLUMN stats_mode TEXT DEFAULT 'rolled';
      ALTER TABLE companions ADD COLUMN rarity TEXT DEFAULT NULL;
      ALTER TABLE companions ADD COLUMN eye TEXT DEFAULT NULL;
      ALTER TABLE companions ADD COLUMN hat TEXT DEFAULT NULL;
      ALTER TABLE companions ADD COLUMN stats_json TEXT DEFAULT NULL;
    `);
  }
}
