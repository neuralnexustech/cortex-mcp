import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCHEMA } from './schema.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUNDLED_SKILLS_DIR = path.resolve(__dirname, '../../skills');

const dbInstances = {};

/**
 * Returns a better-sqlite3 Database instance for the given project path.
 * Creates .cortex/ folder structure if it doesn't exist.
 * Enables WAL mode and foreign keys on every open.
 */
export function getDb(projectPath) {
  const resolved = path.resolve(projectPath);

  if (dbInstances[resolved]) {
    return dbInstances[resolved];
  }

  const cortexDir = path.join(resolved, '.cortex');
  const dbPath = path.join(cortexDir, 'cortex.db');

  // Ensure directory structure exists
  if (!fs.existsSync(cortexDir)) {
    fs.mkdirSync(cortexDir, { recursive: true });
  }
  if (!fs.existsSync(path.join(cortexDir, 'snapshots'))) {
    fs.mkdirSync(path.join(cortexDir, 'snapshots'), { recursive: true });
  }
  if (!fs.existsSync(path.join(cortexDir, 'library', 'snippets'))) {
    fs.mkdirSync(path.join(cortexDir, 'library', 'snippets'), { recursive: true });
  }

  const userSkillsDir = path.join(cortexDir, 'library', 'skills');
  if (!fs.existsSync(userSkillsDir)) {
    fs.mkdirSync(userSkillsDir, { recursive: true });
  }

  // Copy bundled skills to project's .cortex/library/skills/
  if (fs.existsSync(BUNDLED_SKILLS_DIR)) {
    try {
      const files = fs.readdirSync(BUNDLED_SKILLS_DIR).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const srcPath = path.join(BUNDLED_SKILLS_DIR, file);
        const destPath = path.join(userSkillsDir, file);
        let shouldCopy = !fs.existsSync(destPath);
        if (!shouldCopy) {
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.mtimeMs > destStat.mtimeMs || srcStat.size !== destStat.size) {
            shouldCopy = true;
          }
        }
        if (shouldCopy) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    } catch (err) {
      console.error('Failed to copy bundled skills:', err);
    }
  }

  const db = new Database(dbPath);

  // Critical: enable WAL mode for concurrent multi-agent writes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Run all CREATE TABLE IF NOT EXISTS statements
  db.exec(SCHEMA);

  dbInstances[resolved] = db;
  return db;
}

/**
 * Close the DB instance for a project path (for switching projects).
 */
export function closeDb(projectPath) {
  const resolved = path.resolve(projectPath);
  if (dbInstances[resolved]) {
    dbInstances[resolved].close();
    delete dbInstances[resolved];
  }
}

// No-op saveDb for backward compat — better-sqlite3 writes synchronously to disk
export function saveDb() {}
