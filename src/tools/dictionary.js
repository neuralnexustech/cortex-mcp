import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerDictionaryTools(server, withDb) {
  server.tool(
    'cortex_write_dictionary',
    'Write or update a dictionary entry',
    {
      key: z.string().describe('Dictionary key (file or feature name)'),
      short_summary: z.string().optional().describe('Short summary'),
      short: z.string().optional().describe('Short summary (alias)'),
      full_description: z.string().optional().describe('Full description'),
      full: z.string().optional().describe('Full description (alias)'),
      status: z.string().optional().describe('Status (active, broken, archived)')
    },
    async (args) => {
      const shortSummary = args.short_summary || args.short;
      const fullDescription = args.full_description || args.full || '';

      if (!shortSummary) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: short_summary or short' }) }]
        };
      }

      return await withDb((database) => {
        const entry = queries.writeDictionary(database, {
          key: args.key,
          short_summary: shortSummary,
          full_description: fullDescription,
          status: args.status || 'active'
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, entry }, null, 2) }]
        };
      });
    }
  );
}
