import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerDecisionTools(server, withDb) {
  server.tool(
    'cortex_add_decision',
    'Log an architectural decision',
    {
      title: z.string().describe('Decision title'),
      reason: z.string().describe('Reason for decision'),
      alternatives: z.string().optional().describe('Alternatives considered')
    },
    async (args) => {
      return await withDb((database) => {
        const decision = queries.addDecision(database, {
          title: args.title,
          reason: args.reason,
          alternatives: args.alternatives
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, decision }, null, 2) }]
        };
      });
    }
  );
}
