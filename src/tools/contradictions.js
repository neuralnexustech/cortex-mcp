import { z } from 'zod';
import { emitEvent } from '../websocket/server.js';

export function registerContradictionTools(server, withDb) {
  server.tool(
    'cortex_check_contradictions',
    'Find conflicting data in the dictionary. If key provided, checks only that entry. If no key, scans recent entries.',
    {
      key: z.string().optional().describe('Specific dictionary key to check (optional)'),
    },
    async (args) => {
      return await withDb((db) => {
        const contradictions = [];

        if (args.key) {
          // Check specific key for multiple entries with different statuses
          const entries = db.prepare('SELECT * FROM dictionary WHERE key = ? ORDER BY updated_at DESC').all(args.key);
          if (entries.length > 1) {
            const statuses = [...new Set(entries.map(e => e.status))];
            if (statuses.length > 1) {
              contradictions.push({
                key: args.key,
                source_table: 'dictionary',
                old_value: entries[1]?.short_summary,
                new_value: entries[0]?.short_summary,
                status: 'open',
              });
            }
          }
        } else {
          // Scan dictionary for entries with conflicting statuses
          const entries = db.prepare('SELECT * FROM dictionary ORDER BY updated_at DESC').all();
          const byKey = {};
          for (const e of entries) {
            if (!byKey[e.key]) byKey[e.key] = [];
            byKey[e.key].push(e);
          }

          for (const [key, keyEntries] of Object.entries(byKey)) {
            if (keyEntries.length > 1) {
              const statuses = [...new Set(keyEntries.map(e => e.status))];
              if (statuses.length > 1) {
                contradictions.push({
                  key,
                  source_table: 'dictionary',
                  old_value: keyEntries[1]?.short_summary,
                  new_value: keyEntries[0]?.short_summary,
                  status: 'open',
                });
              }
            }
          }

          // Check features with conflicting statuses
          const features = db.prepare('SELECT * FROM features ORDER BY updated_at DESC').all();
          const byName = {};
          for (const f of features) {
            if (!byName[f.name]) byName[f.name] = [];
            byName[f.name].push(f);
          }
          for (const [name, nameFeatures] of Object.entries(byName)) {
            if (nameFeatures.length > 1) {
              const statuses = [...new Set(nameFeatures.map(f => f.status))];
              if (statuses.length > 1) {
                contradictions.push({
                  key: name,
                  source_table: 'features',
                  old_value: `status: ${nameFeatures[1]?.status}`,
                  new_value: `status: ${nameFeatures[0]?.status}`,
                  status: 'open',
                });
              }
            }
          }
        }

        // Store contradictions in DB
        for (const c of contradictions) {
          const existing = db.prepare(
            'SELECT id FROM contradictions WHERE key = ? AND status = ?'
          ).get(c.key, 'open');
          if (!existing) {
            db.prepare(
              'INSERT INTO contradictions (source_table, source_id, key, old_value, new_value, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(c.source_table, 0, c.key, c.old_value, c.new_value, 'open');
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              contradictions_found: contradictions.length,
              contradictions,
              message: contradictions.length === 0
                ? 'No contradictions found'
                : `Found ${contradictions.length} contradiction(s). Use cortex_resolve_contradiction to fix.`,
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_resolve_contradiction',
    'Resolve a contradiction by choosing which version to keep.',
    {
      id: z.number().describe('Contradiction ID'),
      keep_version: z.string().describe('Which version to keep: old, new, or manual'),
      corrected_value: z.string().optional().describe('If keep_version is manual, provide the corrected value'),
    },
    async (args) => {
      return await withDb((db) => {
        const contradiction = db.prepare('SELECT * FROM contradictions WHERE id = ?').get(args.id);
        if (!contradiction) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: `Contradiction ${args.id} not found` }) }] };
        }

        // Update the contradiction record
        db.prepare(
          'UPDATE contradictions SET resolution = ?, status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(args.keep_version, 'resolved', args.id);

        // Emit WebSocket event
        emitEvent('contradiction_resolved', { id: args.id, key: contradiction.key, resolution: args.keep_version });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Contradiction "${contradiction.key}" resolved with version: ${args.keep_version}`,
            }, null, 2)
          }]
        };
      });
    }
  );
}
