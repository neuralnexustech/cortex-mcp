import { z } from 'zod';
import { emitEvent } from '../websocket/server.js';

const DEFAULT_BUDGET = 180000;

export function registerTokenTools(server, withDb) {
  server.tool(
    'cortex_log_tokens',
    'Log token usage for the current action. Call after every tool call.',
    {
      session_id: z.string().describe('Session ID'),
      input_tokens: z.number().describe('Input tokens used'),
      output_tokens: z.number().describe('Output tokens generated'),
    },
    async (args) => {
      return await withDb((db) => {
        db.prepare(
          'INSERT INTO token_log (session_id, input_tokens, output_tokens) VALUES (?, ?, ?)'
        ).run(args.session_id, args.input_tokens, args.output_tokens);

        // Get total for this session
        const total = db.prepare(
          'SELECT SUM(input_tokens + output_tokens) as total FROM token_log WHERE session_id = ?'
        ).get(args.session_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              session_total: total?.total || 0,
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_get_token_budget',
    'Get token budget status for the current session.',
    {
      session_id: z.string().describe('Session ID'),
      budget: z.number().optional().describe('Max token budget (default: 180000)'),
    },
    async (args) => {
      return await withDb((db) => {
        const budget = args.budget || DEFAULT_BUDGET;
        const total = db.prepare(
          'SELECT SUM(input_tokens + output_tokens) as total FROM token_log WHERE session_id = ?'
        ).get(args.session_id);

        const used = total?.total || 0;
        const percent = Math.round((used / budget) * 100);

        let warning_level = 'ok';
        if (percent >= 95) warning_level = 'critical';
        else if (percent >= 80) warning_level = 'danger';
        else if (percent >= 50) warning_level = 'caution';

        // Emit warning event if needed
        if (warning_level === 'danger' || warning_level === 'critical') {
          emitEvent('token_warning', { session_id: args.session_id, used, budget, percent, level: warning_level });
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id: args.session_id,
              used,
              budget,
              percent,
              warning_level,
              message: warning_level === 'critical'
                ? 'CRITICAL: Save snapshot NOW. Context compaction imminent.'
                : warning_level === 'danger'
                ? 'DANGER: High token usage. Consider saving a snapshot.'
                : warning_level === 'caution'
                ? 'CAUTION: Half your token budget is used.'
                : 'Token usage is within normal limits.',
            }, null, 2)
          }]
        };
      });
    }
  );
}
