import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerLibraryTools(server, withDb) {
  server.tool(
    'cortex_add_snippet',
    'Save a code snippet to library',
    {
      title: z.string().describe('Snippet title'),
      code: z.string().describe('Code content'),
      language: z.string().optional().describe('Programming language'),
      tags: z.string().optional().describe('Tags (comma-separated)')
    },
    async (args) => {
      return await withDb((database) => {
        const snippet = queries.addSnippet(database, {
          title: args.title,
          code: args.code,
          language: args.language || '',
          tags: args.tags || ''
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, snippet }, null, 2) }]
        };
      });
    }
  );
}
