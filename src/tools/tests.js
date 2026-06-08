import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerTestTools(server, withDb) {
  server.tool(
    'cortex_add_test',
    'Add a test linked to a feature',
    {
      name: z.string().describe('Test name'),
      feature_id: z.number().optional().describe('Linked feature ID')
    },
    async (args) => {
      return await withDb((database) => {
        const test = queries.addTest(database, {
          name: args.name,
          feature_id: args.feature_id
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, test }, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_update_test',
    'Pass or fail a test',
    {
      id: z.number().describe('Test ID'),
      status: z.string().describe('Status (passed, failed)'),
      error_output: z.string().optional().describe('Error output if failed')
    },
    async (args) => {
      return await withDb((database) => {
        queries.updateTest(database, args.id, {
          status: args.status,
          error_output: args.error_output
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Test ${args.id} ${args.status}` }, null, 2) }]
        };
      });
    }
  );
}
