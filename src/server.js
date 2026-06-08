import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './db/init.js';

import { registerInitTool } from './tools/init.js';
import { registerStateTools } from './tools/state.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerFeatureTools } from './tools/features.js';
import { registerFileTools } from './tools/files.js';
import { registerTestTools } from './tools/tests.js';
import { registerIssueTools } from './tools/issues.js';
import { registerDictionaryTools } from './tools/dictionary.js';
import { registerLibraryTools } from './tools/library.js';
import { registerResearchTools } from './tools/research.js';
import { registerDecisionTools } from './tools/decisions.js';
import { registerReminderTools } from './tools/reminders.js';
import { registerSnapshotTools } from './tools/snapshots.js';
import { registerRollbackTools } from './tools/rollback.js';
import { registerHumanTools } from './tools/human.js';
import { registerHealthTools } from './tools/health.js';
import { registerProjectTools } from './tools/project.js';
import { registerSkillTools, buildSkillResourceHandlers } from './tools/skills.js';
import { registerSearchTools } from './tools/search.js';
import { registerContradictionTools } from './tools/contradictions.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerRoleTools } from './tools/roles.js';
import { registerRelationshipTools } from './tools/relationships.js';
import { registerPrompts } from './prompts/index.js';
import { buildProjectResourceHandlers } from './resources/project.js';
import { createAuditLogger } from './audit/index.js';
import { createEpisodicMemory } from './memory/episodic.js';
import { createContextCompiler } from './memory/compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let PROJECT_PATH = process.env.CORTEX_PROJECT_PATH || process.cwd();

function getProjectPath() {
  return PROJECT_PATH;
}

function getDatabase() {
  return getDb(PROJECT_PATH);
}

function setProjectPath(newPath) {
  closeDb(PROJECT_PATH);
  PROJECT_PATH = newPath;
  process.env.CORTEX_PROJECT_PATH = newPath;
}

function setDb(_newDb) {
  // better-sqlite3: managed by getDb/closeDb
}

// ─── Uncaught Exception Handlers (keep server alive) ─────────────────────
function logError(err) {
  try {
    const errorLogDir = path.join(getProjectPath(), '.cortex');
    if (!fs.existsSync(errorLogDir)) fs.mkdirSync(errorLogDir, { recursive: true });
    const logPath = path.join(errorLogDir, 'error.log');
    const entry = `[${new Date().toISOString()}] ${err?.stack || err}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (_) {}
  console.error('[CORTEX ERROR]', err);
}

process.on('uncaughtException', (err) => {
  logError(err);
  // Do NOT exit — keep server alive
});

process.on('unhandledRejection', (reason) => {
  logError(reason);
});

// ─── MCP Server ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'cortex-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    resources: {}   // enables cortex://skills/<name> resource URIs
  }
});

/**
 * withDb — synchronous wrapper (better-sqlite3 is fully synchronous).
 * Wraps fn(db) in try/catch, returns { error } on failure.
 */
function withDb(fn) {
  try {
    const db = getDatabase();
    return fn(db);
  } catch (err) {
    logError(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message }, null, 2) }]
    };
  }
}

registerInitTool(server, withDb);
registerStateTools(server, withDb);
registerTaskTools(server, withDb);
registerFeatureTools(server, withDb);
registerFileTools(server, withDb, getProjectPath);
registerTestTools(server, withDb);
registerIssueTools(server, withDb);
registerDictionaryTools(server, withDb);
registerLibraryTools(server, withDb);
registerResearchTools(server, withDb);
registerDecisionTools(server, withDb);
registerReminderTools(server, withDb);
registerSnapshotTools(server, withDb, getProjectPath);
registerRollbackTools(server, withDb, getProjectPath);
registerHumanTools(server, withDb, getProjectPath);
registerHealthTools(server, withDb);
registerProjectTools(server, setDb, setProjectPath);
registerSkillTools(server, getProjectPath);
registerSearchTools(server, withDb);
registerContradictionTools(server, withDb);
registerTokenTools(server, withDb);
registerRoleTools(server, withDb);
registerRelationshipTools(server, withDb);

// ─── V2.1: Prompts, Enhanced Resources, Audit, Memory ─────────────────────
registerPrompts(server);

// ─── MCP Resources — cortex://skills/<name> + cortex://project, etc. ──────
const skillResources = buildSkillResourceHandlers(getProjectPath);
const projectResources = buildProjectResourceHandlers(withDb, getProjectPath);
if (server.server && typeof server.server.setRequestHandler === 'function') {
  import('@modelcontextprotocol/sdk/types.js').then(({ ListResourcesRequestSchema, ReadResourceRequestSchema }) => {
    // Merge skill + project resources
    server.server.setRequestHandler(ListResourcesRequestSchema, async (req) => {
      const skillRes = await skillResources.listResources(req);
      const projectRes = await projectResources.listResources(req);
      return { resources: [...skillRes.resources, ...projectRes.resources] };
    });
    server.server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
      const uri = req.params?.uri;
      if (uri?.startsWith('cortex://skills/')) {
        return await skillResources.readResource(uri);
      }
      return await projectResources.readResource(uri);
    });
  }).catch(() => {});
}

// ─── Audit Logger + Episodic Memory + Context Compiler (lazy init) ────────
let _audit, _episodic, _contextCompiler;
function getAudit() {
  if (!_audit) { try { _audit = createAuditLogger(getDatabase()); } catch (_) {} }
  return _audit;
}
function getEpisodic() {
  if (!_episodic) { try { _episodic = createEpisodicMemory(getDatabase()); } catch (_) {} }
  return _episodic;
}
function getContextCompiler() {
  if (!_contextCompiler) { try { _contextCompiler = createContextCompiler(getDatabase()); } catch (_) {} }
  return _contextCompiler;
}

// Expose for API server
export { getAudit, getEpisodic, getContextCompiler };

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cortex MCP server running on stdio');
}

main().catch((err) => {
  logError(err);
  process.exit(1);
});
