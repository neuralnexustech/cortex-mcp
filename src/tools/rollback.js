import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as queries from '../db/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerRollbackTools(server, withDb, getProjectPath) {
  server.tool(
    'cortex_rollback',
    'Restore file to checkpoint',
    {
      file_path: z.string().describe('File path to restore'),
      checkpoint_id: z.number().optional().describe('Specific checkpoint ID (latest if not provided)')
    },
    async (args) => {
      return await withDb((database) => {
        let checkpoint;
        if (args.checkpoint_id) {
          checkpoint = queries.getCheckpoint(database, args.checkpoint_id);
        } else {
          const checkpoints = queries.getCheckpoints(database, args.file_path);
          checkpoint = checkpoints[0];
        }

        if (!checkpoint) {
          return {
            content: [{ type: 'text', text: `No checkpoint found for ${args.file_path}` }]
          };
        }

        const fullPath = path.join(getProjectPath(), args.file_path);
        fs.writeFileSync(fullPath, checkpoint.content);

        queries.logProgress(database, {
          task: `Rolled back ${args.file_path}`,
          file_path: args.file_path,
          notes: `Restored from checkpoint ${checkpoint.id}`,
          agent: 'system'
        });

        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: true,
            message: `Restored ${args.file_path} from checkpoint ${checkpoint.id}`
          }, null, 2) }]
        };
      });
    }
  );
}
