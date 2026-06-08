/**
 * MCP Prompts — pre-built templates for common agent tasks
 * These help agents start sessions with structured guidance.
 */

export function registerPrompts(server) {
  // Prompt: Start a new session
  server.prompt(
    'start-session',
    'Initialize a new Cortex session — call cortex_get_state first, then cortex_get_next_task',
    {},
    () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You are starting a new coding session with Cortex MCP.

STEPS:
1. Call cortex_get_state to get compressed project context
2. Call cortex_get_next_task to get the highest-priority pending todo
3. Work on the task
4. After each step: cortex_log_progress, cortex_tick_file (if file created), cortex_check_reminders
5. At session end: cortex_save_snapshot

RULES:
- NEVER decide your own next step — always call cortex_get_next_task
- ALWAYS call cortex_check_reminders after each task
- Track EVERY file you create with cortex_tick_file
- Log progress immediately after each step`
        }
      }]
    })
  );

  // Prompt: Debug an issue
  server.prompt(
    'debug-issue',
    'Structured debugging workflow — log issue, investigate, fix, resolve',
    {
      issue_title: { type: 'string', description: 'What is the issue?' },
      file_path: { type: 'string', description: 'Related file (optional)' }
    },
    (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Debug the following issue: ${args.issue_title}
${args.file_path ? `Related file: ${args.file_path}` : ''}

STEPS:
1. cortex_log_issue — log the issue with title, description, and file_path
2. Read the file and understand the problem
3. Fix the issue
4. cortex_resolve_issue — mark resolved with fix description
5. cortex_check_reminders — ensure no warnings
6. cortex_log_progress — log what you did`
        }
      }]
    })
  );

  // Prompt: Code review
  server.prompt(
    'review-code',
    'Review a file — check for issues, log findings, suggest improvements',
    {
      file_path: { type: 'string', description: 'File to review' }
    },
    (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Review the file: ${args.file_path}

STEPS:
1. Read the file carefully
2. Check for bugs, security issues, performance problems
3. If issues found: cortex_log_issue for each
4. cortex_write_dictionary — document the file's purpose and structure
5. cortex_add_relationship — link file to its feature (if applicable)
6. cortex_log_progress — log your review findings`
        }
      }]
    })
  );

  // Prompt: Initialize new project
  server.prompt(
    'init-project',
    'Full onboarding workflow — ask 10 questions, then initialize',
    {},
    () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Initialize a new Cortex project.

You MUST ask the human ALL 10 onboarding questions FIRST using cortex_ask_human:
1. What is the project name?
2. What is the goal of this project? (describe in detail)
3. What is the tech stack? (frontend, backend, database, language)
4. What UI style do you want? (minimal, modern, neon, etc.)
5. What libraries or frameworks are preferred?
6. Are there any libraries or files the agent must NOT touch?
7. What is the expected file/folder structure?
8. Any existing codebase? (provide path or say no)
9. What are the core features? (list them one by one)
10. What is the complexity level? (small / medium / large)

After getting ALL answers, call cortex_init with all parameters.
Then call cortex_get_next_task to start working.`
        }
      }]
    })
  );

  // Prompt: End session
  server.prompt(
    'end-session',
    'Wrap up the current session — save snapshot, check final state',
    {
      summary: { type: 'string', description: 'Session summary (what was accomplished)' }
    },
    (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `End the current session.

${args.summary ? `Session summary: ${args.summary}` : 'Write a summary of what was accomplished.'}

STEPS:
1. cortex_save_snapshot — save session summary to DB and disk
2. cortex_check_reminders — final health check
3. cortex_get_state — verify final project state
4. Report any remaining open issues or next steps`
        }
      }]
    })
  );
}
