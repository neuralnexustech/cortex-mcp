import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerStateTools(server, withDb) {
  server.tool(
    'cortex_get_state',
    'Get compressed project state (under 200 tokens) — call before every action. Includes token budget warning if >50% used.',
    {
      session_id: z.string().optional().describe('Session ID for token budget check'),
    },
    async (args) => {
      return withDb((db) => {
        const project = queries.getProject(db);
        if (!project) {
          return {
            content: [{ type: 'text', text: 'No project initialized. Call cortex_init first.' }]
          };
        }

        const features = queries.getFeatures(db);
        const todos = queries.getTodos(db);
        const issues = queries.getIssues(db);
        const openIssues = issues.filter(i => i.status === 'open');
        const progress = queries.getProgress(db);
        const snapshot = queries.getLatestSnapshot(db);

        const last5Progress = progress.slice(0, 5).map(p => ({
          task: p.task,
          agent: p.agent,
          at: p.created_at
        }));

        const featuresDone = features.filter(f => f.status === 'done').length;
        const pendingTodos = todos.length;
        const completedTodos = db.prepare("SELECT COUNT(*) as count FROM todos WHERE status != 'pending'").get()?.count ?? 0;

        const nextTask = queries.getNextTask(db);
        const openIssuesList = openIssues.map(i => ({ id: i.id, title: i.title }));

        // V2: Token budget warning
        let tokenWarning = null;
        if (args.session_id) {
          try {
            const total = db.prepare(
              'SELECT SUM(input_tokens + output_tokens) as total FROM token_log WHERE session_id = ?'
            ).get(args.session_id);
            const used = total?.total || 0;
            const budget = 180000;
            const percent = Math.round((used / budget) * 100);
            if (percent >= 50) {
              tokenWarning = {
                used,
                budget,
                percent,
                level: percent >= 95 ? 'critical' : percent >= 80 ? 'danger' : 'caution',
                message: percent >= 95
                  ? 'CRITICAL: Save snapshot NOW. Context compaction imminent.'
                  : percent >= 80
                  ? 'DANGER: High token usage. Save snapshot.'
                  : 'CAUTION: Half your token budget used.',
              };
            }
          } catch (err) {
            // token_log table might not exist yet
          }
        }

        const state = {
          project: project.name,
          goal: project.goal,
          status: project.status,
          todos_pending: pendingTodos,
          todos_done: completedTodos,
          features_total: features.length,
          features_done: featuresDone,
          open_issues_count: openIssues.length,
          open_issues: openIssuesList,
          next_task: nextTask,
          last_snapshot: snapshot ? snapshot.created_at : null,
          last_snapshot_summary: snapshot ? snapshot.summary.substring(0, 120) : null,
          last_5_progress: last5Progress
        };

        if (tokenWarning) {
          state.token_warning = tokenWarning;
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(state) }]
        };
      });
    }
  );

  server.tool(
    'cortex_get_detail',
    'Get full dictionary entry for a file or feature',
    {
      key: z.string().describe('Dictionary key (file or feature name)')
    },
    async (args) => {
      if (!args.key) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: key' }) }] };
      }
      return withDb((db) => {
        const entry = queries.getDictionaryEntry(db, args.key);
        if (!entry) {
          return {
            content: [{ type: 'text', text: `No dictionary entry found for "${args.key}"` }]
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }]
        };
      });
    }
  );
}
