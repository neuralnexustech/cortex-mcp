import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCHEMA } from './schema.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUNDLED_SKILLS_DIR = path.resolve(__dirname, '../../skills');

const dbInstances = {};

export function getConfigPath(projectPath) {
  return path.join(path.resolve(projectPath), '.cortex', 'config.json');
}

export function readConfig(projectPath) {
  const configPath = getConfigPath(projectPath);
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (_) {}
  return null;
}

export function writeConfig(projectPath, config) {
  const configPath = getConfigPath(projectPath);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getOrCreateConfig(projectPath) {
  let config = readConfig(projectPath);
  if (!config) {
    config = { api_port: 3001, mcp_port: 4759, created_at: new Date().toISOString() };
    writeConfig(projectPath, config);
  }
  return config;
}

export function findNextAvailablePort() {
  const registryPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.cortex', 'ports.json');
  let registry = {};
  try {
    if (fs.existsSync(registryPath)) {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
  } catch (_) {}
  let apiPort = 3001;
  let mcpPort = 4759;
  const used = new Set(Object.values(registry).map(p => p.api_port));
  while (used.has(apiPort)) apiPort++;
  return { api_port: apiPort, mcp_port: mcpPort };
}

export function registerPort(projectPath, config) {
  const registryPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.cortex', 'ports.json');
  const dir = path.dirname(registryPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let registry = {};
  try {
    if (fs.existsSync(registryPath)) {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
  } catch (_) {}
  registry[path.resolve(projectPath)] = config;
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

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
