import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import * as queries from '../db/queries.js';

export function registerSnapshotTools(server, withDb, getProjectPath) {
  server.tool(
    'cortex_save_snapshot',
    'Compress current session to summary, save to DB and .cortex/snapshots/ on disk',
    {
      summary: z.string().describe('Session summary in plain English'),
      session_id: z.string().optional().describe('Session ID (auto-generated if not provided)'),
      agent: z.string().optional().describe('Agent that created the snapshot')
    },
    async (args) => {
      if (!args.summary) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: summary' }) }] };
      }

      try {
        const sessionId = args.session_id || `session-${Date.now()}`;

        return withDb((db) => {
          // Save to DB
          const snapshot = queries.saveSnapshot(db, {
            session_id: sessionId,
            summary: args.summary,
            agent: args.agent || 'unknown'
          });

          // Write .md file to disk
          const projectPath = getProjectPath();
          const snapshotsDir = path.join(projectPath, '.cortex', 'snapshots');
          if (!fs.existsSync(snapshotsDir)) {
            fs.mkdirSync(snapshotsDir, { recursive: true });
          }

          const fileName = `${sessionId}.md`;
          const filePath = path.join(snapshotsDir, fileName);
          const mdContent = [
            `# Cortex Session Snapshot`,
            ``,
            `**Session ID:** ${sessionId}`,
            `**Agent:** ${args.agent || 'unknown'}`,
            `**Timestamp:** ${new Date().toISOString()}`,
            ``,
            `## Summary`,
            ``,
            args.summary,
            ``
          ].join('\n');

          fs.writeFileSync(filePath, mdContent, 'utf8');

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                snapshot,
                md_file: filePath
              }, null, 2)
            }]
          };
        });
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }]
        };
      }
    }
  );
}
