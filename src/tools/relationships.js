import { z } from 'zod';
import { emitEvent } from '../websocket/server.js';

export function registerRelationshipTools(server, withDb) {
  server.tool(
    'cortex_add_relationship',
    'Create a relationship between two entities (feature, file, test, issue, decision).',
    {
      source_type: z.string().describe('Source entity type: feature, file, test, issue, decision'),
      source_id: z.number().describe('Source entity ID'),
      target_type: z.string().describe('Target entity type: feature, file, test, issue, decision'),
      target_id: z.number().describe('Target entity ID'),
      relationship: z.string().describe('Relationship type: creates, tests, affects, blocks, resolves'),
    },
    async (args) => {
      const validTypes = ['feature', 'file', 'test', 'issue', 'decision'];
      const validRels = ['creates', 'tests', 'affects', 'blocks', 'resolves'];

      if (!validTypes.includes(args.source_type) || !validTypes.includes(args.target_type)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Invalid entity type. Must be: ${validTypes.join(', ')}` }) }] };
      }
      if (!validRels.includes(args.relationship)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Invalid relationship. Must be: ${validRels.join(', ')}` }) }] };
      }

      return await withDb((db) => {
        // Check for duplicate
        const existing = db.prepare(
          'SELECT id FROM relationships WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ? AND relationship = ?'
        ).get(args.source_type, args.source_id, args.target_type, args.target_id, args.relationship);

        if (existing) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Relationship already exists', id: existing.id }) }] };
        }

        const result = db.prepare(
          'INSERT INTO relationships (source_type, source_id, target_type, target_id, relationship) VALUES (?, ?, ?, ?, ?)'
        ).run(args.source_type, args.source_id, args.target_type, args.target_id, args.relationship);

        emitEvent('relationship_added', {
          source: `${args.source_type}-${args.source_id}`,
          target: `${args.target_type}-${args.target_id}`,
          relationship: args.relationship,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              id: result.lastInsertRowid,
              source: `${args.source_type}:${args.source_id}`,
              target: `${args.target_type}:${args.target_id}`,
              relationship: args.relationship,
            }, null, 2)
          }]
        };
      });
    }
  );
}
