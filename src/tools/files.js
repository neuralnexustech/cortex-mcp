import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { minimatch } from 'minimatch';
import * as queries from '../db/queries.js';

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isIgnored(filePath, projectPath) {
  try {
    const ignorePath = path.join(projectPath, '.cortex', '.cortexignore');
    if (!fs.existsSync(ignorePath)) return false;
    const patterns = fs.readFileSync(ignorePath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const normalized = normalizePath(filePath);
    return patterns.some(pattern => minimatch(normalized, pattern, { matchBase: true }));
  } catch (_) {
    return false;
  }
}

export function registerFileTools(server, withDb, getProjectPath) {
  server.tool(
    'cortex_tick_file',
    'Mark a file as created/done in file tree. Saves checkpoint if file exists on disk.',
    {
      file_path: z.string().describe('File path (relative to project root)'),
      status: z.string().optional().describe('Status (done, in-progress, pending)'),
      feature_id: z.number().optional().describe('Linked feature ID'),
      test_id: z.number().optional().describe('Linked test ID'),
      agent: z.string().optional().describe('Agent name')
    },
    async (args) => {
      if (!args.file_path) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: file_path' }) }] };
      }

      try {
        const projectPath = getProjectPath();
        const normalizedPath = normalizePath(args.file_path);

        // .cortexignore check
        if (isIgnored(normalizedPath, projectPath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: `File "${normalizedPath}" is listed in .cortexignore. Agent must not touch this file.`
              })
            }]
          };
        }

        return withDb((db) => {
          // Save checkpoint if file exists on disk
          const fullPath = path.join(projectPath, normalizedPath);
          if (fs.existsSync(fullPath)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              queries.saveCheckpoint(db, {
                file_path: normalizedPath,
                content,
                agent: args.agent || 'system'
              });
            } catch (_) {
              // Binary or unreadable file — skip checkpoint
            }
          }

          const file = queries.tickFile(db, {
            file_path: normalizedPath,
            status: args.status || 'done',
            feature_id: args.feature_id,
            test_id: args.test_id,
            agent: args.agent || 'unknown'
          });

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, file }, null, 2) }]
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
