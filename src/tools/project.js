import { z } from 'zod';
import path from 'path';
import fs from 'fs';

export function registerProjectTools(server, setDb, setProjectPath) {
  server.tool(
    'cortex_set_active_project',
    'Switch active project (loads different .cortex DB). Blocked when process was started with --project (locked to single project).',
    {
      project_path: z.string().describe('Path to project directory')
    },
    async (args) => {
      if (process.env.CORTEX_SINGLE_PROJECT === '1') {
        const current = process.env.CORTEX_PROJECT_PATH || 'unknown';
        return {
          content: [{ type: 'text', text: JSON.stringify({
            error: 'Project switching blocked',
            reason: 'This agent was started with --project and is locked to a single project.',
            current_project: current,
            hint: 'To work on a different project, start a new agent: cortex start --project <path>'
          }, null, 2) }]
        };
      }

      const newPath = args.project_path;
      if (!fs.existsSync(path.join(newPath, '.cortex', 'cortex.db'))) {
        return {
          content: [{ type: 'text', text: `No Cortex project found at ${newPath}` }]
        };
      }
      
      setDb(null);
      setProjectPath(newPath);
      process.env.CORTEX_PROJECT_PATH = newPath;
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Switched to project at ${newPath}`
        }, null, 2) }]
      };
    }
  );
}
