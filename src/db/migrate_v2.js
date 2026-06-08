import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run V2 migration on the database.
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ success: boolean, tables_added: string[], error?: string }}
 */
export function migrateV2(db) {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'cortex_v2.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Get tables before migration
    const tablesBefore = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
      .map(r => r.name);

    // Run the migration
    db.exec(sql);

    // Get tables after migration
    const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
      .map(r => r.name);

    // New tables added
    const tablesAdded = tablesAfter.filter(t => !tablesBefore.includes(t));

    // Verify FTS tables exist
    const ftsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'").all()
      .map(r => r.name);

    // Verify FTS is populated
    const ftsCounts = {};
    for (const fts of ftsTables) {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${fts}`).get();
      ftsCounts[fts] = row?.count ?? 0;
    }

    return {
      success: true,
      tables_added: tablesAdded,
      fts_tables: ftsTables,
      fts_counts: ftsCounts,
      v2_tables: ['embeddings', 'contradictions', 'token_log', 'agent_roles', 'relationships']
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
