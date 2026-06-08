import { z } from 'zod';
import path from 'path';
import fs from 'fs';

export function registerProjectTools(server, setDb, setProjectPath) {
  server.tool(
    'cortex_set_active_project',
    'Switch active project (loads different .cortex DB)',
    {
      project_path: z.string().describe('Path to project directory')
    },
    async (args) => {
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
