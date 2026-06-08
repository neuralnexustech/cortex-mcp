import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerResearchTools(server, withDb) {
  server.tool(
    'cortex_add_research',
    'Save library research notes',
    {
      library_name: z.string().optional().describe('Library name'),
      library: z.string().optional().describe('Library name (alias)'),
      version: z.string().optional().describe('Version'),
      notes: z.string().describe('Research notes'),
      source_url: z.string().optional().describe('Source URL'),
      url: z.string().optional().describe('Source URL (alias)')
    },
    async (args) => {
      const libraryName = args.library_name || args.library;
      const sourceUrl = args.source_url || args.url;

      if (!libraryName) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: library_name or library' }) }]
        };
      }

      return await withDb((database) => {
        const research = queries.addResearch(database, {
          library_name: libraryName,
          version: args.version,
          notes: args.notes,
          source_url: sourceUrl
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, research }, null, 2) }]
        };
      });
    }
  );
}
