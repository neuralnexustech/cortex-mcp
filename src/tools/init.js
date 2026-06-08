import { z } from 'zod';
import * as queries from '../db/queries.js';

export function registerInitTool(server, withDb) {
  server.tool(
    'cortex_init',
    'Initialize Cortex project. You MUST ask the human ALL 10 onboarding questions FIRST using cortex_ask_human. ' +
    'Do NOT call this tool until you have all answers. The 10 mandatory questions are: ' +
    '1) Project name, 2) Goal, 3) Tech stack, 4) UI style, 5) Preferred libs, ' +
    '6) Forbidden libs, 7) File structure, 8) Existing codebase, 9) Core features, 10) Complexity level.',
    {
      project_name: z.string().describe('Project name (from human answer to question 1)'),
      goal: z.string().describe('Project goal description (from human answer to question 2)'),
      stack: z.string().describe('Tech stack (from human answer to question 3)'),
      ui_style: z.string().optional().describe('UI style (from human answer to question 4)'),
      preferred_libs: z.string().optional().describe('Preferred libraries (from human answer to question 5)'),
      forbidden_libs: z.string().optional().describe('Forbidden libs (from human answer to question 6)'),
      file_structure: z.string().optional().describe('Expected file/folder structure (from human answer to question 7)'),
      existing_codebase: z.string().optional().describe('Existing codebase path or "no" (from human answer to question 8)'),
      core_features: z.string().describe('Core features, comma-separated (from human answer to question 9)'),
      complexity: z.string().optional().describe('Complexity level (from human answer to question 10)')
    },
    async (args) => {
      return await withDb((database) => {
        // Check if project already initialized
        const existing = queries.getProject(database);
        if (existing) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Project already initialized as "${existing.name}". Call cortex_get_state to continue.`,
                project_id: existing.id
              }, null, 2)
            }]
          };
        }

        // Step 1: Create project record with ALL onboarding answers
        const project = queries.createProject(database, {
          name: args.project_name,
          goal: args.goal,
          stack: args.stack,
          ui_style: args.ui_style || '',
          preferred_libs: args.preferred_libs || '',
          forbidden_libs: args.forbidden_libs || '',
          file_structure: args.file_structure || '',
          existing_codebase: args.existing_codebase || 'no',
          complexity: args.complexity || 'medium'
        });

        // Step 2: Create features with meaningful descriptions from the goal context
        const features = args.core_features.split(',').map(f => f.trim()).filter(Boolean);
        const createdFeatures = [];
        for (const feature of features) {
          const f = queries.addFeature(database, {
            name: feature,
            description: `Part of: ${args.goal}. ${feature} — implements a core capability of the ${args.project_name} system.`,
            priority: 'medium'
          });
          createdFeatures.push(f);
        }

        // Step 3: Build initial todo list from features + project setup tasks
        for (const feature of createdFeatures) {
          queries.addTodo(database, {
            task: `Implement feature: ${feature.name}`,
            priority: 5,
            status: 'pending',
            feature_id: feature.id
          });
        }

        // Add foundational setup todos (high priority)
        const setupTasks = [
          { task: 'Set up project file/folder structure', priority: 1 },
          { task: 'Create database schema and configuration', priority: 2 },
          { task: 'Implement core entry point and server initialization', priority: 3 }
        ];
        for (const st of setupTasks) {
          queries.addTodo(database, {
            task: st.task,
            priority: st.priority,
            status: 'pending'
          });
        }

        // Step 4: Create initial relationships between features
        for (let i = 0; i < createdFeatures.length; i++) {
          for (let j = i + 1; j < createdFeatures.length; j++) {
            // Link features that might be related (first creates last if sequential)
            if (i === 0 && j === createdFeatures.length - 1) {
              try {
                database.prepare(
                  'INSERT OR IGNORE INTO relationships (source_type, source_id, target_type, target_id, relationship) VALUES (?, ?, ?, ?, ?)'
                ).run('feature', createdFeatures[i].id, 'feature', createdFeatures[j].id, 'creates');
              } catch (_) {}
            }
          }
        }

        // Step 5: Log the initialization
        queries.logProgress(database, {
          task: `Project initialized: "${args.project_name}"`,
          notes: `Goal: ${args.goal.substring(0, 150)}. Stack: ${args.stack}. ${createdFeatures.length} features, ${setupTasks.length + createdFeatures.length} todos. Next: call cortex_get_next_task to start.`,
          agent: 'system'
        });

        // Step 6: Write initial dictionary entry for the project
        queries.writeDictionary(database, {
          key: `${args.project_name} — Project Overview`,
          short_summary: `${args.project_name}: ${args.goal.substring(0, 100)}`,
          full_description: `Stack: ${args.stack}\nComplexity: ${args.complexity || 'medium'}\nFeatures: ${features.join(', ')}\n${args.forbidden_libs ? 'Forbidden: ' + args.forbidden_libs : ''}`,
          status: 'active'
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              project_id: project.id,
              features_added: createdFeatures.length,
              todos_created: setupTasks.length + createdFeatures.length,
              message: `Cortex initialized for "${args.project_name}". ` +
                `${createdFeatures.length} features and ${setupTasks.length + createdFeatures.length} todos created. ` +
                `Call cortex_get_next_task to start working.`,
              onboarding_complete: true
            }, null, 2)
          }]
        };
      });
    }
  );
}
