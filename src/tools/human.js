import { z } from 'zod';
import * as queries from '../db/queries.js';
import { emitEvent, emitConfirmRequest, getClientCount } from '../websocket/server.js';

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 60000;

export function registerHumanTools(server, withDb, getProjectPath) {
  server.tool(
    'cortex_ask_human',
    'Force pause, queue a question for human, block until answered via POST /api/human-answer',
    {
      question: z.string().describe('Question to ask the human'),
      agent: z.string().optional().describe('Agent asking the question')
    },
    async (args) => {
      if (!args.question) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: question' }) }] };
      }

      try {
        let questionId;
        const writeResult = withDb((db) => {
          return queries.createHumanQuestion(db, {
            question: args.question,
            agent: args.agent || 'unknown'
          });
        });

        if (writeResult?.error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: writeResult.error }) }] };
        }

        questionId = writeResult.id;

        // Emit WebSocket event so dashboard shows the question
        emitEvent('question_asked', { id: questionId, question: args.question, agent: args.agent });

        const startTime = Date.now();
        return await new Promise((resolve) => {
          const poll = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= MAX_WAIT_MS) {
              resolve({
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    type: 'timeout',
                    question_id: questionId,
                    question: args.question,
                    message: 'No answer received within 60 seconds. Action cancelled.'
                  })
                }]
              });
              return;
            }

            const row = withDb((db) => queries.getHumanQuestion(db, questionId));
            if (row && row.status === 'answered') {
              resolve({
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    type: 'answered',
                    question_id: questionId,
                    question: args.question,
                    answer: row.answer,
                    answered_at: row.answered_at
                  })
                }]
              });
            } else {
              setTimeout(poll, POLL_INTERVAL_MS);
            }
          };
          setTimeout(poll, 500);
        });
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }]
        };
      }
    }
  );

  // V2: Full cortex_confirm_destructive implementation
  server.tool(
    'cortex_confirm_destructive',
    'Block dangerous actions until human confirms. Shows red modal in dashboard. Falls back to terminal if no dashboard.',
    {
      action: z.string().describe('Description of the destructive action (e.g., "delete file src/auth.py")'),
      target: z.string().optional().describe('What will be affected (e.g., file path, DB table, feature name)'),
    },
    async (args) => {
      if (!args.action) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required field: action' }) }] };
      }

      try {
        // Try WebSocket confirmation first (if dashboard is connected)
        if (getClientCount() > 0) {
          const result = await emitConfirmRequest(args.action, args.target || 'unknown', MAX_WAIT_MS);

          // Log the confirmation request
          withDb((db) => {
            queries.logProgress(db, {
              task: `Destructive action ${result.confirmed ? 'APPROVED' : 'DENIED'}: ${args.action}`,
              notes: `Target: ${args.target}. Decision: ${result.confirmed ? 'YES' : 'NO'}. Reason: ${result.reason || 'human'}`,
              agent: 'system'
            });
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                confirmed: result.confirmed,
                action: args.action,
                target: args.target,
                method: 'dashboard',
                message: result.confirmed
                  ? 'Human confirmed. Proceed with action.'
                  : `Action cancelled: ${result.reason || 'human declined'}`,
              }, null, 2)
            }]
          };
        }

        // Fallback: terminal input (if no dashboard connected)
        // For non-interactive environments, return false with instructions
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              confirmed: false,
              action: args.action,
              target: args.target,
              method: 'terminal',
              message: 'No dashboard connected. Destructive action blocked. Connect dashboard or use POST /api/human-answer to respond.',
              question_action: args.action,
            }, null, 2)
          }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }]
        };
      }
    }
  );
}
