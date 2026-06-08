import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerTaskTools(server, withDb) {
  server.tool(
    'cortex_get_next_task',
    'Get next pending todo - agent always calls this, never decides own next step',
    {},
    async () => {
      return await withDb((database) => {
        const next = queries.getNextTask(database);
        if (!next) {
          return {
            content: [{ type: 'text', text: 'ALL TASKS COMPLETE' }]
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(next, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_log_progress',
    'Log a completed step',
    {
      task: z.string().describe('Task completed'),
      file_path: z.string().optional().describe('File affected'),
      file: z.string().optional().describe('File affected (alias)'),
      notes: z.string().optional().describe('Additional notes'),
      agent: z.string().optional().describe('Agent name')
    },
    async (args) => {
      const filePath = args.file_path || args.file;
      return await withDb((database) => {
        const entry = queries.logProgress(database, {
          task: args.task,
          file_path: filePath,
          notes: args.notes,
          agent: args.agent || 'unknown'
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, entry }, null, 2) }]
        };
      });
    }
  );
}
