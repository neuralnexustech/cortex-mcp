import { z } from 'zod';
import { emitEvent } from '../websocket/server.js';

const VALID_ROLES = ['researcher', 'builder', 'reviewer', 'orchestrator'];

const ROLE_PERMISSIONS = {
  researcher: ['cortex_get_state', 'cortex_get_detail', 'cortex_search', 'cortex_write_dictionary', 'cortex_log_progress', 'cortex_add_research', 'cortex_get_skill', 'cortex_list_skills', 'cortex_check_reminders', 'cortex_log_tokens', 'cortex_get_token_budget'],
  builder: ['cortex_get_state', 'cortex_get_detail', 'cortex_get_next_task', 'cortex_log_progress', 'cortex_tick_file', 'cortex_add_feature', 'cortex_update_feature', 'cortex_add_test', 'cortex_update_test', 'cortex_log_issue', 'cortex_resolve_issue', 'cortex_write_dictionary', 'cortex_add_snippet', 'cortex_add_research', 'cortex_add_decision', 'cortex_check_reminders', 'cortex_save_snapshot', 'cortex_rollback', 'cortex_search', 'cortex_log_tokens', 'cortex_get_token_budget', 'cortex_add_relationship'],
  reviewer: ['cortex_get_state', 'cortex_get_detail', 'cortex_search', 'cortex_log_issue', 'cortex_resolve_issue', 'cortex_add_decision', 'cortex_update_test', 'cortex_check_reminders', 'cortex_log_progress', 'cortex_log_tokens', 'cortex_get_token_budget'],
  orchestrator: ['*'], // all tools
};

export function registerRoleTools(server, withDb) {
  server.tool(
    'cortex_set_role',
    'Set the role for an agent. Roles control which tools the agent can call.',
    {
      agent_name: z.string().describe('Agent name (e.g., claude, gemini, opencode)'),
      role: z.string().describe('Role: researcher, builder, reviewer, or orchestrator'),
    },
    async (args) => {
      if (!VALID_ROLES.includes(args.role)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Invalid role. Must be: ${VALID_ROLES.join(', ')}` }) }] };
      }

      return await withDb((db) => {
        const existing = db.prepare('SELECT * FROM agent_roles WHERE agent_name = ?').get(args.agent_name);
        if (existing) {
          db.prepare('UPDATE agent_roles SET role = ?, last_seen = CURRENT_TIMESTAMP WHERE agent_name = ?').run(args.role, args.agent_name);
        } else {
          db.prepare('INSERT INTO agent_roles (agent_name, role) VALUES (?, ?)').run(args.agent_name, args.role);
        }

        emitEvent('agent_connected', { agent: args.agent_name, role: args.role });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              agent: args.agent_name,
              role: args.role,
              permissions: ROLE_PERMISSIONS[args.role],
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_get_role',
    'Get the role and permissions for an agent.',
    {
      agent_name: z.string().describe('Agent name'),
    },
    async (args) => {
      return await withDb((db) => {
        const agent = db.prepare('SELECT * FROM agent_roles WHERE agent_name = ?').get(args.agent_name);
        if (!agent) {
          return { content: [{ type: 'text', text: JSON.stringify({ role: 'builder', note: 'Default role (not registered)' }) }] };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agent: agent.agent_name,
              role: agent.role,
              permissions: ROLE_PERMISSIONS[agent.role],
              last_seen: agent.last_seen,
            }, null, 2)
          }]
        };
      });
    }
  );

  server.tool(
    'cortex_list_agents',
    'List all connected agents and their roles.',
    {},
    async () => {
      return await withDb((db) => {
        const agents = db.prepare('SELECT * FROM agent_roles ORDER BY last_seen DESC').all();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agents: agents.map(a => ({
                name: a.agent_name,
                role: a.role,
                last_seen: a.last_seen,
              })),
              count: agents.length,
            }, null, 2)
          }]
        };
      });
    }
  );
}

/**
 * Check if an agent has permission to call a tool.
 */
export function checkPermission(db, agentName, toolName) {
  if (!agentName) return true; // No agent specified, allow

  const agent = db.prepare('SELECT * FROM agent_roles WHERE agent_name = ?').get(agentName);
  if (!agent) return true; // No role set, allow (default builder)

  const permissions = ROLE_PERMISSIONS[agent.role];
  if (!permissions) return true;
  if (permissions.includes('*')) return true;
  return permissions.includes(toolName);
}
