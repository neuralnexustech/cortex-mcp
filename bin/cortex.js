#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { getOrCreateConfig, writeConfig, registerPort, registerAgent, unregisterAgent, findNextAvailablePort } from '../src/db/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('cortex')
  .description('Cortex MCP - Persistent brain for AI coding agents')
  .version('2.6.0');

program
  .command('init')
  .description('Initialize Cortex and print MCP config to paste into your agent')
  .option('--project <path>', 'Project path', process.cwd())
  .action((options) => {
    const projectPath = path.resolve(options.project);
    const cortexDir = path.join(projectPath, '.cortex');

    if (!fs.existsSync(cortexDir)) {
      fs.mkdirSync(cortexDir, { recursive: true });
      fs.mkdirSync(path.join(cortexDir, 'snapshots'), { recursive: true });
      fs.mkdirSync(path.join(cortexDir, 'library', 'snippets'), { recursive: true });
      fs.mkdirSync(path.join(cortexDir, 'library', 'skills'), { recursive: true });
      console.log('✓ Created .cortex/ directory structure');
    } else {
      console.log('✓ .cortex/ already exists');
    }

    const ports = findNextAvailablePort();
    let config = getOrCreateConfig(projectPath);
    config.api_port = config.api_port || ports.api_port;
    config.mcp_port = config.mcp_port || ports.mcp_port;
    config.name = path.basename(projectPath);
    writeConfig(projectPath, config);
    registerPort(projectPath, config);

    console.log(`✓ Cortex initialized in: ${projectPath}`);
    console.log(`✓ Database: ${path.join(cortexDir, 'cortex.db')}`);
    console.log(`✓ Config: ${path.join(cortexDir, 'config.json')}`);
    console.log('');

    const binPath = path.resolve(__dirname, 'cortex.js');
    const mcpConfig = {
      mcpServers: {
        cortex: {
          command: 'node',
          args: [binPath, 'start', '--project', projectPath]
        }
      }
    };

    console.log('─────────────────────────────────────────────────────────────');
    console.log('  MCP CONFIG — paste this into your agent config file:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(mcpConfig, null, 2));
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');
    console.log(`Dashboard: http://localhost:${config.mcp_port}`);
    console.log(`REST API:  http://localhost:${config.api_port}`);
    console.log('');
    console.log('Start the server with:  cortex start --project ' + projectPath);
    console.log('Start the dashboard with:  cortex dashboard --project ' + projectPath);
  });

program
  .command('start')
  .description('Start the Cortex MCP server (stdio transport)')
  .option('--project <path>', 'Project path', process.cwd())
  .action((options) => {
    const projectPath = path.resolve(options.project);
    const config = getOrCreateConfig(projectPath);
    process.env.CORTEX_PROJECT_PATH = projectPath;
    process.env.CORTEX_API_PORT = String(config.api_port);
    process.env.CORTEX_PORT = String(config.mcp_port);
    process.env.CORTEX_SINGLE_PROJECT = '1';

    const agentId = `agent-${config.api_port}`;
    registerAgent(projectPath, agentId, config);
    process.on('exit', () => { try { unregisterAgent(projectPath, agentId); } catch (_) {} });
    process.on('SIGINT', () => { try { unregisterAgent(projectPath, agentId); } catch (_) {} process.exit(0); });

    const binPath = path.resolve(__dirname, 'cortex.js');
    const child = spawn('node', [binPath, 'dashboard', '--project', projectPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    import('../src/server.js');
  });

program
  .command('dashboard')
  .description('Start the dashboard REST API server')
  .option('--project <path>', 'Project path', process.cwd())
  .option('--port <port>', 'API port number')
  .option('--dashboard-port <port>', 'Dashboard port number')
  .action((options) => {
    const projectPath = path.resolve(options.project);
    const config = getOrCreateConfig(projectPath);
    process.env.CORTEX_PROJECT_PATH = projectPath;
    process.env.CORTEX_API_PORT = options.port || String(config.api_port);
    process.env.CORTEX_PORT = options.dashboardPort || String(config.mcp_port);
    process.env.CORTEX_SINGLE_PROJECT = '1';
    import('../src/api/server.js');
  });

program
  .command('status')
  .description('Show Cortex status for current project')
  .action(async () => {
    const cwd = process.cwd();
    const dbPath = path.join(cwd, '.cortex', 'cortex.db');
    const configPath = path.join(cwd, '.cortex', 'config.json');

    if (!fs.existsSync(dbPath)) {
      console.log('No Cortex project found in current directory. Run "cortex init" first.');
      return;
    }

    console.log(`✓ Cortex project found at: ${cwd}`);
    console.log(`✓ Database: ${dbPath}`);

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`✓ API Port: ${config.api_port}`);
      console.log(`✓ MCP Port: ${config.mcp_port}`);
    } catch (_) {}

    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`✓ Tables: ${tables.map(t => t.name).join(', ')}`);
      db.close();
    } catch (_) {}
  });

program
  .command('health')
  .description('Check Cortex DB health')
  .action(async () => {
    const cwd = process.cwd();
    const dbPath = path.join(cwd, '.cortex', 'cortex.db');

    if (!fs.existsSync(dbPath)) {
      console.log('HEALTH: No project initialized. Run "cortex init" first.');
      return;
    }

    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const openIssues = db.prepare("SELECT COUNT(*) as count FROM issues WHERE status='open'").get();
      console.log('HEALTH: OK');
      console.log(`Tables: ${tables.length} (${tables.map(t => t.name).join(', ')})`);
      console.log(`Open issues: ${openIssues?.count ?? 0}`);
      console.log(`WAL mode: ${db.pragma('journal_mode', { simple: true })}`);
      db.close();
    } catch (err) {
      console.log(`HEALTH: ERROR — ${err.message}`);
    }
  });

program.parse();
