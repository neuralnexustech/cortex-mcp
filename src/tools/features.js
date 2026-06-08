import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerFeatureTools(server, withDb) {
  server.tool(
    'cortex_add_feature',
    'Add a new feature',
    {
      name: z.string().describe('Feature name'),
      description: z.string().optional().describe('Feature description'),
      priority: z.string().optional().describe('Priority (high, medium, low)')
    },
    async (args) => {
      return await withDb((database) => {
        const feature = queries.addFeature(database, {
          name: args.name,
          description: args.description || args.name,
          priority: args.priority || 'medium'
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, feature }, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_update_feature',
    'Update feature status',
    {
      id: z.number().describe('Feature ID'),
      status: z.string().describe('New status (pending, in-progress, done, blocked)')
    },
    async (args) => {
      return await withDb((database) => {
        queries.updateFeature(database, args.id, { status: args.status });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Feature ${args.id} updated to ${args.status}` }, null, 2) }]
        };
      });
    }
  );
}
