import * as queries from '../db/queries.js';
import { emitEvent } from '../websocket/server.js';

let activeLoops = {};

export function getActiveLoop(pipelineId) {
  return activeLoops[pipelineId] || null;
}

export function setActiveLoop(pipelineId, loop) {
  if (loop) {
    activeLoops[pipelineId] = loop;
  } else {
    delete activeLoops[pipelineId];
  }
}

export function runPipelineLoop(db, pipelineId, executor, options = {}) {
  const run = queries.getPipelineRun(db, pipelineId);
  if (!run) return { error: 'Pipeline not found' };
  if (run.status === 'completed' || run.status === 'failed') return { error: `Pipeline already ${run.status}` };

  const loop = {
    id: pipelineId,
    status: 'running',
    paused: false,
    cancelled: false,
    currentTask: null
  };

  setActiveLoop(pipelineId, loop);

  queries.updatePipelineRun(db, pipelineId, { status: 'running' });

  emitEvent('pipeline_running', { pipeline_id: pipelineId, goal: run.goal });

  return { loop };
}

export function pausePipeline(db, pipelineId) {
  const loop = getActiveLoop(pipelineId);
  if (loop) loop.paused = true;

  queries.updatePipelineRun(db, pipelineId, { status: 'paused' });

  emitEvent('pipeline_paused', { pipeline_id: pipelineId });
  return { success: true };
}

export function resumePipeline(db, pipelineId) {
  const loop = getActiveLoop(pipelineId);
  if (loop) loop.paused = false;

  queries.updatePipelineRun(db, pipelineId, { status: 'running' });

  emitEvent('pipeline_resumed', { pipeline_id: pipelineId });
  return { success: true };
}

export function cancelPipeline(db, pipelineId) {
  const loop = getActiveLoop(pipelineId);
  if (loop) loop.cancelled = true;

  queries.updatePipelineRun(db, pipelineId, { status: 'failed' });

  const tasks = queries.getPipelineTasks(db, pipelineId);
  for (const task of tasks) {
    if (task.status === 'pending' || task.status === 'in_progress') {
      queries.updatePipelineTask(db, task.id, { status: 'failed', error_output: 'Cancelled' });
    }
  }

  emitEvent('pipeline_cancelled', { pipeline_id: pipelineId });
  return { success: true };
}

export function getPipelineStatus(db, pipelineId) {
  const run = queries.getPipelineRun(db, pipelineId);
  if (!run) return null;

  const tasks = queries.getPipelineTasks(db, pipelineId);

  const counts = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return {
    run,
    tasks: tasks.map(t => ({
      id: t.id,
      label: t.label,
      status: t.status,
      retry_count: t.retry_count,
      error_output: t.error_output
    })),
    counts,
    progress: tasks.length > 0 ? Math.round((counts.completed / tasks.length) * 100) : 0
  };
}
