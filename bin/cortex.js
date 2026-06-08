#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('cortex')
  .description('Cortex MCP - Persistent brain for AI coding agents')
  .version('2.0.0');

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

    console.log(`✓ Cortex initialized in: ${projectPath}`);
    console.log(`✓ Database: ${path.join(cortexDir, 'cortex.db')}`);
    console.log('');

    // Absolute path to bin/cortex.js for MCP config
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
    console.log('Dashboard: http://localhost:4759');
    console.log('REST API:  http://localhost:3001');
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
    process.env.CORTEX_PROJECT_PATH = projectPath;

    // Spawn the API/Dashboard server in the background
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
  .option('--port <port>', 'API port number', '3001')
  .option('--dashboard-port <port>', 'Dashboard port number', '4759')
  .action((options) => {
    process.env.CORTEX_PROJECT_PATH = path.resolve(options.project);
    process.env.CORTEX_API_PORT = options.port;
    process.env.CORTEX_PORT = options.dashboardPort;
    import('../src/api/server.js');
  });

program
  .command('status')
  .description('Show Cortex status for current project')
  .action(async () => {
    const cwd = process.cwd();
    const dbPath = path.join(cwd, '.cortex', 'cortex.db');

    if (!fs.existsSync(dbPath)) {
      console.log('No Cortex project found in current directory. Run "cortex init" first.');
      return;
    }

    console.log(`✓ Cortex project found at: ${cwd}`);
    console.log(`✓ Database: ${dbPath}`);

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
