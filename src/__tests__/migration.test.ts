import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { migrateLegacyPaths } from '../db/schema.js';

function makeFakeHome(): string {
  return mkdtempSync(join(tmpdir(), 'bbuddy-migrate-'));
}

describe('migrateLegacyPaths', () => {
  it('copies ~/.bbddy/bbddy.db to ~/.bbuddy/bbuddy.db when the new path is empty', () => {
    const home = makeFakeHome();
    try {
      mkdirSync(join(home, '.bbddy'), { recursive: true });
      writeFileSync(join(home, '.bbddy', 'bbddy.db'), 'LEGACY-DB');

      migrateLegacyPaths(home);

      const newDb = join(home, '.bbuddy', 'bbuddy.db');
      expect(existsSync(newDb)).toBe(true);
      expect(readFileSync(newDb, 'utf8')).toBe('LEGACY-DB');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('falls through to ~/.buddy/buddy.db if .bbddy is missing', () => {
    const home = makeFakeHome();
    try {
      mkdirSync(join(home, '.buddy'), { recursive: true });
      writeFileSync(join(home, '.buddy', 'buddy.db'), 'UPSTREAM-DB');

      migrateLegacyPaths(home);

      const newDb = join(home, '.bbuddy', 'bbuddy.db');
      expect(existsSync(newDb)).toBe(true);
      expect(readFileSync(newDb, 'utf8')).toBe('UPSTREAM-DB');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('prefers .bbddy/ over .buddy/ when both exist', () => {
    const home = makeFakeHome();
    try {
      mkdirSync(join(home, '.bbddy'), { recursive: true });
      mkdirSync(join(home, '.buddy'), { recursive: true });
      writeFileSync(join(home, '.bbddy', 'bbddy.db'), 'PHASE1');
      writeFileSync(join(home, '.buddy', 'buddy.db'), 'UPSTREAM');

      migrateLegacyPaths(home);

      expect(readFileSync(join(home, '.bbuddy', 'bbuddy.db'), 'utf8')).toBe('PHASE1');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('does not overwrite an existing ~/.bbuddy/bbuddy.db', () => {
    const home = makeFakeHome();
    try {
      mkdirSync(join(home, '.bbuddy'), { recursive: true });
      mkdirSync(join(home, '.bbddy'), { recursive: true });
      writeFileSync(join(home, '.bbuddy', 'bbuddy.db'), 'CURRENT');
      writeFileSync(join(home, '.bbddy', 'bbddy.db'), 'LEGACY');

      migrateLegacyPaths(home);

      expect(readFileSync(join(home, '.bbuddy', 'bbuddy.db'), 'utf8')).toBe('CURRENT');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('migrates ~/.claude/bbddy-status.json to bbuddy-status.json', () => {
    const home = makeFakeHome();
    try {
      mkdirSync(join(home, '.claude'), { recursive: true });
      writeFileSync(join(home, '.claude', 'bbddy-status.json'), '{"name":"legacy"}');

      migrateLegacyPaths(home);

      const newStatus = join(home, '.claude', 'bbuddy-status.json');
      expect(existsSync(newStatus)).toBe(true);
      expect(readFileSync(newStatus, 'utf8')).toBe('{"name":"legacy"}');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('is a no-op when nothing legacy exists', () => {
    const home = makeFakeHome();
    try {
      migrateLegacyPaths(home);
      // No crash and no stray files. The function does create ~/.bbuddy
      // via mkdir when there's nothing to copy, which is harmless.
      expect(existsSync(join(home, '.bbuddy', 'bbuddy.db'))).toBe(false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
