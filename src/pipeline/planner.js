import * as queries from '../db/queries.js';
import { emitEvent } from '../websocket/server.js';

const TASK_TEMPLATES = {
  setup: {
    required: true,
    label: 'Setup project structure',
    expected: 'Project files created'
  },
  implement: {
    required: true,
    label: 'Implement core logic',
    expected: 'Feature implementation complete'
  },
  test: {
    required: false,
    label: 'Write tests',
    expected: 'Tests passing'
  },
  verify: {
    required: false,
    label: 'Verify implementation',
    expected: 'All checks passing'
  },
  document: {
    required: false,
    label: 'Add documentation',
    expected: 'Documentation written'
  }
};

function inferTasksFromGoal(goal, features, files) {
  const goalLower = goal.toLowerCase();
  const tasks = [];

  tasks.push({
    label: `Plan: ${goal}`,
    action_type: 'agent',
    expected_result: 'Goal broken into actionable steps',
    sort_order: 1
  });

  // Setup phase
  const hasStructure = files.some(f => f.status === 'done');
  if (!hasStructure) {
    tasks.push({
      label: 'Setup project structure',
      action_type: 'agent',
      expected_result: 'Project structure ready',
      sort_order: 2
    });
  }

  // Feature phases
  const existingFeatureNames = features.map(f => f.name.toLowerCase());
  let sortOrder = 3;

  if (goalLower.includes('auth') || goalLower.includes('login') || goalLower.includes('user')) {
    if (!existingFeatureNames.some(n => n.includes('auth'))) {
      tasks.push({ label: 'Implement authentication', action_type: 'agent', expected_result: 'Auth working', sort_order: sortOrder++ });
      tasks.push({ label: 'Test authentication flow', action_type: 'agent', expected_result: 'Auth tests passing', sort_order: sortOrder++ });
    }
  }
  if (goalLower.includes('api') || goalLower.includes('endpoint') || goalLower.includes('route')) {
    if (!existingFeatureNames.some(n => n.includes('api'))) {
      tasks.push({ label: 'Build API endpoints', action_type: 'agent', expected_result: 'API responsive', sort_order: sortOrder++ });
      tasks.push({ label: 'Test API endpoints', action_type: 'agent', expected_result: 'API tests passing', sort_order: sortOrder++ });
    }
  }
  if (goalLower.includes('database') || goalLower.includes('db') || goalLower.includes('schema')) {
    if (!existingFeatureNames.some(n => n.includes('db') || n.includes('database') || n.includes('schema'))) {
      tasks.push({ label: 'Design database schema', action_type: 'agent', expected_result: 'Schema created', sort_order: sortOrder++ });
      tasks.push({ label: 'Create migrations', action_type: 'agent', expected_result: 'Migrations run', sort_order: sortOrder++ });
    }
  }
  if (goalLower.includes('ui') || goalLower.includes('dashboard') || goalLower.includes('page')) {
    if (!existingFeatureNames.some(n => n.includes('ui') || n.includes('page'))) {
      tasks.push({ label: 'Build UI components', action_type: 'agent', expected_result: 'UI rendered', sort_order: sortOrder++ });
      tasks.push({ label: 'Test UI rendering', action_type: 'agent', expected_result: 'UI tests passing', sort_order: sortOrder++ });
    }
  }
  if (goalLower.includes('pipeline') || goalLower.includes('ci') || goalLower.includes('deploy')) {
    tasks.push({ label: 'Setup CI/CD pipeline', action_type: 'agent', expected_result: 'Pipeline running', sort_order: sortOrder++ });
  }

  // Always add test + verify
  tasks.push({ label: 'Run all tests', action_type: 'agent', expected_result: 'All tests passing', sort_order: sortOrder++ });
  tasks.push({ label: 'Final verification', action_type: 'agent', expected_result: 'Goal complete', sort_order: sortOrder++ });

  return tasks;
}

function buildDag(tasks) {
  const dag = [];
  let prevId = null;

  for (let i = 0; i < tasks.length; i++) {
    const node = {
      ...tasks[i],
      parent_id: prevId,
      sort_order: tasks[i].sort_order || (i + 1)
    };
    dag.push(node);
    prevId = null; // flat DAG, each depends on the one before
  }

  return dag;
}

export function planGoal(db, goal, options = {}) {
  const features = queries.getFeatures(db);
  const files = queries.getFiles(db);

  const plan = {
    goal,
    summary: `Plan for: ${goal}`,
    estimated_steps: 0,
    tasks: []
  };

  const rawTasks = inferTasksFromGoal(goal, features, files);
  const dag = buildDag(rawTasks);
  plan.tasks = dag;
  plan.estimated_steps = dag.length;

  return plan;
}

export function createPipelineFromPlan(db, plan, options = {}) {
  const run = queries.createPipelineRun(db, {
    goal: plan.goal,
    status: 'planning',
    plan: { summary: plan.summary, estimated_steps: plan.estimated_steps },
    session_id: options.session_id,
    agent: options.agent,
    max_retries: options.max_retries ?? 3,
    pause_on_human: options.pause_on_human ?? 1
  });

  if (run.error) return run;

  for (const task of plan.tasks) {
    queries.addPipelineTask(db, {
      pipeline_id: run.id,
      parent_id: task.parent_id,
      label: task.label,
      action_type: task.action_type || 'agent',
      command: task.command || null,
      expected_result: task.expected_result || null,
      status: 'pending',
      sort_order: task.sort_order,
      agent: task.agent || options.agent || null
    });
  }

  queries.updatePipelineRun(db, run.id, { status: 'running', plan: { summary: plan.summary, estimated_steps: plan.estimated_steps, task_count: plan.tasks.length } });

  const tasks = queries.getPipelineTasks(db, run.id);

  emitEvent('pipeline_started', {
    pipeline_id: run.id,
    goal: plan.goal,
    task_count: tasks.length,
    tasks: tasks.map(t => ({ id: t.id, label: t.label, status: t.status }))
  });

  return { run, tasks };
}
