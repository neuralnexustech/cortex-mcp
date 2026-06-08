import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerIssueTools(server, withDb) {
  server.tool(
    'cortex_log_issue',
    'Log a bug or blocker',
    {
      title: z.string().describe('Issue title'),
      description: z.string().optional().describe('Issue description'),
      file_path: z.string().optional().describe('Related file')
    },
    async (args) => {
      return await withDb((database) => {
        const issue = queries.logIssue(database, {
          title: args.title,
          description: args.description,
          file_path: args.file_path
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, issue }, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_resolve_issue',
    'Mark issue resolved with fix description',
    {
      id: z.number().describe('Issue ID'),
      fix: z.string().describe('Fix description')
    },
    async (args) => {
      return await withDb((database) => {
        queries.resolveIssue(database, args.id, args.fix);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Issue ${args.id} resolved` }, null, 2) }]
        };
      });
    }
  );
}
