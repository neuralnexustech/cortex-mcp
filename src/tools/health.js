import { z } from 'zod';
import * as queries from '../db/queries.js';
import fs from 'fs';
import path from 'path';

export function registerHealthTools(server, withDb) {
  server.tool(
    'cortex_health',
    'Check DB integrity, missing tests, open issues, broken files. Auto-repairs common problems.',
    {
      auto_repair: z.boolean().optional().describe('Auto-repair problems (default: true)'),
    },
    async (args) => {
      return await withDb((db) => {
        const autoRepair = args.auto_repair !== false;
        const repaired = [];
        const warnings = [];
        const errors = [];

        // 1. Rebuild FTS tables if out of sync
        try {
          const dictCount = db.prepare('SELECT COUNT(*) as c FROM dictionary').get().c;
          const ftsCount = db.prepare('SELECT COUNT(*) as c FROM dictionary_fts').get().c;
          if (Math.abs(dictCount - ftsCount) > 0 && autoRepair) {
            db.prepare("INSERT OR IGNORE INTO dictionary_fts(rowid, key, short_summary, full_description) SELECT id, key, short_summary, full_description FROM dictionary").run();
            repaired.push('Rebuilt dictionary FTS index');
          }
        } catch (err) {
          warnings.push(`FTS rebuild check failed: ${err.message}`);
        }

        // 2. Check for orphaned embeddings
        try {
          const orphaned = db.prepare(
            "SELECT e.id FROM embeddings e LEFT JOIN dictionary d ON e.source_table = 'dictionary' AND e.source_id = d.id WHERE d.id IS NULL AND e.source_table = 'dictionary'"
          ).all();
          if (orphaned.length > 0 && autoRepair) {
            db.prepare("DELETE FROM embeddings WHERE id IN (SELECT e.id FROM embeddings e LEFT JOIN dictionary d ON e.source_table = 'dictionary' AND e.source_id = d.id WHERE d.id IS NULL AND e.source_table = 'dictionary')").run();
            repaired.push(`Removed ${orphaned.length} orphaned embeddings`);
          }
        } catch (err) {
          // embeddings table might not exist yet
        }

        // 3. Check features marked done but tests failing
        try {
          const doneFeatures = db.prepare("SELECT * FROM features WHERE status = 'done'").all();
          for (const f of doneFeatures) {
            const failedTests = db.prepare("SELECT * FROM tests WHERE feature_id = ? AND status = 'failed'").all(f.id);
            if (failedTests.length > 0 && autoRepair) {
              db.prepare("UPDATE features SET status = 'in-progress' WHERE id = ?").run(f.id);
              repaired.push(`Reset feature "${f.name}" to in-progress (test failing)`);
            }
          }
        } catch (err) {
          warnings.push(`Feature-test check failed: ${err.message}`);
        }

        // 4. Check files in file_tree but not on disk
        try {
          const projectPath = process.env.CORTEX_PROJECT_PATH || process.cwd();
          const files = db.prepare("SELECT * FROM file_tree WHERE status = 'done'").all();
          for (const f of files) {
            const fullPath = path.join(projectPath, f.file_path);
            if (!fs.existsSync(fullPath)) {
              if (autoRepair) {
                db.prepare("UPDATE file_tree SET status = 'missing' WHERE id = ?").run(f.id);
                db.prepare("INSERT INTO issues (title, description, file_path, status) VALUES (?, ?, ?, 'open')").run(
                  `File missing: ${f.file_path}`,
                  `File ${f.file_path} is listed in file_tree but does not exist on disk.`,
                  f.file_path
                );
                repaired.push(`Marked "${f.file_path}" as missing`);
              } else {
                warnings.push(`File missing: ${f.file_path}`);
              }
            }
          }
        } catch (err) {
          warnings.push(`File existence check failed: ${err.message}`);
        }

        // 5. Resolve old contradictions (> 7 days)
        try {
          const oldContradictions = db.prepare(
            "SELECT * FROM contradictions WHERE status = 'open' AND created_at < datetime('now', '-7 days')"
          ).all();
          if (oldContradictions.length > 0 && autoRepair) {
            for (const c of oldContradictions) {
              db.prepare("INSERT INTO issues (title, description, status) VALUES (?, ?, 'open')").run(
                `Unresolved contradiction: ${c.key}`,
                `Contradiction about "${c.key}" has been open for over 7 days. Old: ${c.old_value}. New: ${c.new_value}`
              );
              db.prepare("UPDATE contradictions SET status = 'escalated' WHERE id = ?").run(c.id);
            }
            repaired.push(`Escalated ${oldContradictions.length} old contradictions to issues`);
          }
        } catch (err) {
          // contradictions table might not exist
        }

        // Standard health check
        const health = queries.healthCheck(db);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...health,
              auto_repair: autoRepair,
              repaired,
              warnings,
              errors,
              summary: repaired.length > 0
                ? `Repaired ${repaired.length} issue(s). ${warnings.length} warning(s).`
                : warnings.length > 0
                ? `${warnings.length} warning(s). No repairs needed.`
                : 'All checks passed. No issues found.',
            }, null, 2)
          }]
        };
      });
    }
  );
}
