import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { homedir } from 'os';

// Migrate from pre-rename locations if the new paths don't exist yet.
// .bbddy/ is the Phase 1 rename; .buddy/ is the original upstream path.
// First hit wins — .bbddy/ is newer and more likely to have recent data.
// Exported so hooks (which can't import TypeScript) and tests can reuse it.
export function migrateLegacyPaths(home: string = homedir()): void {
  const newDir = path.join(home, '.bbuddy');
  const newDb = path.join(newDir, 'bbuddy.db');
  const legacyDbs = [
    path.join(home, '.bbddy', 'bbddy.db'),
    path.join(home, '.buddy', 'buddy.db'),
  ];
  if (!existsSync(newDb)) {
    mkdirSync(newDir, { recursive: true });
    for (const legacy of legacyDbs) {
      if (existsSync(legacy)) {
        try { copyFileSync(legacy, newDb); break; } catch { /* non-fatal */ }
      }
    }
  }
  const claudeDir = path.join(home, '.claude');
  const newStatus = path.join(claudeDir, 'bbuddy-status.json');
  const legacyStatus = path.join(claudeDir, 'bbddy-status.json');
  if (existsSync(claudeDir) && !existsSync(newStatus) && existsSync(legacyStatus)) {
    try { copyFileSync(legacyStatus, newStatus); } catch { /* non-fatal */ }
  }
}

migrateLegacyPaths();

const bbuddyDir = path.join(homedir(), '.bbuddy');
mkdirSync(bbuddyDir, { recursive: true });
const dbPath = path.join(bbuddyDir, 'bbuddy.db');

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

  // bbuddy schema migrations — safe to run on existing DBs
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
