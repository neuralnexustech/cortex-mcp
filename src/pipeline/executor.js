import * as queries from '../db/queries.js';
import { emitEvent } from '../websocket/server.js';

export function createExecutor(db, options = {}) {
  async function executeTask(task) {
    const taskId = task.id;

    queries.updatePipelineTask(db, taskId, { status: 'in_progress' });

    emitEvent('pipeline_task_started', {
      task_id: taskId,
      label: task.label,
      action_type: task.action_type
    });

    let result;

    switch (task.action_type) {
      case 'agent':
        result = await executeAgentTask(task);
        break;
      case 'command':
        result = await executeCommandTask(task);
        break;
      case 'test':
        result = await executeTestTask(task, db);
        break;
      case 'verify':
        result = await executeVerifyTask(task, db);
        break;
      default:
        result = await executeAgentTask(task);
    }

    return result;
  }

  function markResult(task, success, error = null) {
    const taskId = task.id;
    const status = success ? 'completed' : 'failed';

    queries.updatePipelineTask(db, taskId, { status, error_output: error });

    queries.logProgress(db, {
      task: `[Pipeline] ${task.label}`,
      notes: success ? 'Completed' : `Failed: ${error}`,
      agent: task.agent || 'pipeline'
    });

    emitEvent('pipeline_task_completed', {
      task_id: taskId,
      label: task.label,
      status,
      error
    });

    return { success, error };
  }

  async function executeAgentTask(task) {
    return { success: true, result: 'agent_task' };
  }

  async function executeCommandTask(task) {
    return { success: true, result: 'command_task' };
  }

  async function executeTestTask(task, database) {
    const failedTests = queries.getFailedTests(database);
    if (failedTests.length === 0) return { success: true };

    for (const test of failedTests.slice(0, 3)) {
      queries.updateTest(database, test.id, {
        status: 'pending',
        error_output: null
      });
    }

    const remaining = queries.getFailedTests(database);
    return {
      success: remaining.length === 0,
      result: `Reset ${failedTests.length} failed tests`
    };
  }

  async function executeVerifyTask(task, database) {
    const health = queries.healthCheck(database);
    const issues = queries.getIssues(database);
    const openIssues = issues.filter(i => i.status === 'open');

    return {
      success: openIssues.length === 0,
      result: {
        health,
        open_issues: openIssues.length,
        all_clear: openIssues.length === 0
      }
    };
  }

  async function retryTask(task, retryCount) {
    queries.updatePipelineTask(db, task.id, {
      status: 'pending',
      retry_count: (task.retry_count || 0) + 1,
      error_output: null
    });

    queries.logProgress(db, {
      task: `[Pipeline] Retry #${retryCount}: ${task.label}`,
      notes: `Attempt ${retryCount + 1}`,
      agent: task.agent || 'pipeline'
    });

    emitEvent('pipeline_retrying', {
      task_id: task.id,
      label: task.label,
      attempt: retryCount + 1
    });
  }

  return { executeTask, markResult, retryTask };
}
