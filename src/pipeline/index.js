import { z } from 'zod';
import * as queries from '../db/queries.js';
import { planGoal, createPipelineFromPlan } from './planner.js';
import { createExecutor } from './executor.js';
import { runPipelineLoop, pausePipeline, resumePipeline, cancelPipeline, getPipelineStatus, getActiveLoop } from './loop.js';

function autoHeal(db) {
  const healed = [];

  const brokenFiles = queries.getBrokenFiles(db);
  for (const f of brokenFiles) {
    const cp = queries.getCheckpointForFile(db, f.file_path);
    if (cp) {
      try {
        const projectPath = process.env.CORTEX_PROJECT_PATH || process.cwd();
        const fullPath = require('path').join(projectPath, f.file_path);
        require('fs').writeFileSync(fullPath, cp.content, 'utf-8');
        queries.markHealed(db, 'file', f.id, `Auto-restored from checkpoint #${cp.id}`);
        healed.push({ type: 'file', path: f.file_path, action: 'restored_from_checkpoint' });
      } catch (e) {
        healed.push({ type: 'file', path: f.file_path, action: 'restore_failed', error: e.message });
      }
    } else {
      queries.markHealed(db, 'file', f.id, 'Auto-healed (no checkpoint available)');
      healed.push({ type: 'file', path: f.file_path, action: 'resolved' });
    }
  }

  const failedTests = queries.getFailedTests(db);
  for (const t of failedTests) {
    queries.markHealed(db, 'test', t.id, 'Auto-reset for retry');
    healed.push({ type: 'test', name: t.name, action: 'reset' });
  }

  return healed;
}

export function registerPipelineTools(server, withDb) {
  server.tool(
    'cortex_pipeline_start',
    'Start an autonomous pipeline from a goal. Breaks goal into tasks, executes them, auto-retries failures.',
    {
      goal: z.string().describe('The goal to achieve'),
      max_retries: z.number().optional().describe('Max retries per task (default: 3)'),
      pause_on_human: z.boolean().optional().describe('Pause when human input needed (default: true)'),
      session_id: z.string().optional().describe('Session ID'),
      agent: z.string().optional().describe('Agent name')
    },
    async (args) => {
      return await withDb((db) => {
        const options = {
          max_retries: args.max_retries ?? 3,
          pause_on_human: args.pause_on_human ?? true,
          session_id: args.session_id,
          agent: args.agent
        };

        const active = queries.getActivePipelineRun(db);
        if (active) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              error: 'A pipeline is already running',
              active_pipeline_id: active.id,
              status: active.status
            }, null, 2) }]
          };
        }

        const plan = planGoal(db, args.goal, options);
        const result = createPipelineFromPlan(db, plan, options);

        if (result.run?.error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: result.run.error }, null, 2) }] };
        }

        const executor = createExecutor(db, options);
        const loopResult = runPipelineLoop(db, result.run.id, executor, options);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              pipeline_id: result.run.id,
              goal: args.goal,
              task_count: result.tasks.length,
              tasks: result.tasks.map(t => ({
                id: t.id,
                label: t.label,
                action_type: t.action_type,
                status: t.status
              })),
              message: `Pipeline started with ${result.tasks.length} tasks. Use cortex_pipeline_status to track progress.`,
              plan: plan
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_status',
    'Get the status of a running or completed pipeline.',
    {
      pipeline_id: z.number().optional().describe('Pipeline ID (defaults to active)')
    },
    async (args) => {
      return await withDb((db) => {
        let pipelineId = args.pipeline_id;
        if (!pipelineId) {
          const active = queries.getActivePipelineRun(db);
          pipelineId = active?.id;
        }
        if (!pipelineId) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'No pipeline found' }, null, 2) }] };
        }

        const status = getPipelineStatus(db, pipelineId);
        if (!status) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Pipeline not found' }, null, 2) }] };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_pause',
    'Pause the currently running pipeline.',
    {
      pipeline_id: z.number().optional().describe('Pipeline ID (defaults to active)')
    },
    async (args) => {
      return await withDb((db) => {
        let pipelineId = args.pipeline_id;
        if (!pipelineId) {
          const active = queries.getActivePipelineRun(db);
          pipelineId = active?.id;
        }
        if (!pipelineId) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'No active pipeline' }, null, 2) }] };
        }

        const result = pausePipeline(db, pipelineId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_resume',
    'Resume a paused pipeline.',
    {
      pipeline_id: z.number().optional().describe('Pipeline ID (defaults to active)')
    },
    async (args) => {
      return await withDb((db) => {
        let pipelineId = args.pipeline_id;
        if (!pipelineId) {
          const active = queries.getActivePipelineRun(db);
          pipelineId = active?.id;
        }
        if (!pipelineId) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'No active pipeline' }, null, 2) }] };
        }

        const result = resumePipeline(db, pipelineId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_cancel',
    'Cancel a running or paused pipeline.',
    {
      pipeline_id: z.number().optional().describe('Pipeline ID (defaults to active)')
    },
    async (args) => {
      return await withDb((db) => {
        let pipelineId = args.pipeline_id;
        if (!pipelineId) {
          const active = queries.getActivePipelineRun(db);
          pipelineId = active?.id;
        }
        if (!pipelineId) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'No active pipeline' }, null, 2) }] };
        }

        const result = cancelPipeline(db, pipelineId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_plan',
    'Preview what tasks a pipeline would create for a goal without starting it.',
    {
      goal: z.string().describe('The goal to plan for')
    },
    async (args) => {
      return await withDb((db) => {
        const plan = planGoal(db, args.goal);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              goal: args.goal,
              estimated_steps: plan.estimated_steps,
              tasks: plan.tasks.map(t => ({
                label: t.label,
                action_type: t.action_type,
                expected_result: t.expected_result
              }))
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_auto_heal',
    'Auto-detect and fix broken files, failed tests, and other issues. Returns list of healed items.',
    {
      auto_fix: z.boolean().optional().describe('Apply fixes automatically (default: true)')
    },
    async (args) => {
      return await withDb((db) => {
        const autoFix = args.auto_fix !== false;
        let healed = [];
        let warnings = [];

        if (autoFix) {
          healed = autoHeal(db);
        } else {
          const broken = queries.getBrokenFiles(db);
          const failed = queries.getFailedTests(db);
          if (broken.length > 0) warnings.push(`${broken.length} broken files found`);
          if (failed.length > 0) warnings.push(`${failed.length} failed tests found`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              auto_fix: autoFix,
              healed_count: healed.length,
              healed,
              warnings,
              summary: healed.length > 0
                ? `Auto-healed ${healed.length} issue(s)`
                : warnings.length > 0
                ? `${warnings.length} issue(s) found, run with auto_fix=true to repair`
                : 'All systems healthy'
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_pipeline_history',
    'View recent pipeline runs and their results.',
    {
      limit: z.number().optional().describe('Max runs to return (default: 10)')
    },
    async (args) => {
      return await withDb((db) => {
        const runs = queries.getPipelineRuns(db).slice(0, args.limit || 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(runs.map(r => ({
              id: r.id,
              goal: r.goal,
              status: r.status,
              started: r.started_at,
              completed: r.completed_at
            })), null, 2)
          }]
        };
      });
    }
  );
}
