/**
 * MCP Resources — expose project data as read-only resources
 * URI scheme: cortex://project, cortex://features, cortex://dictionary, etc.
 */

export function buildProjectResourceHandlers(withDb, getProjectPath) {
  const RESOURCE_URIS = [
    { uri: 'cortex://project', name: 'Project State', description: 'Current project configuration and status', mimeType: 'application/json' },
    { uri: 'cortex://features', name: 'Features', description: 'All project features with status', mimeType: 'application/json' },
    { uri: 'cortex://files', name: 'File Tree', description: 'All tracked files', mimeType: 'application/json' },
    { uri: 'cortex://tests', name: 'Tests', description: 'All tests with status', mimeType: 'application/json' },
    { uri: 'cortex://issues', name: 'Issues', description: 'Open and resolved issues', mimeType: 'application/json' },
    { uri: 'cortex://dictionary', name: 'Dictionary', description: 'File and feature documentation', mimeType: 'application/json' },
    { uri: 'cortex://progress', name: 'Progress Log', description: 'Recent activity and completed steps', mimeType: 'application/json' },
    { uri: 'cortex://todos', name: 'Pending Tasks', description: 'Next tasks to work on', mimeType: 'application/json' },
    { uri: 'cortex://relationships', name: 'Knowledge Graph', description: 'Entity relationships (features, files, tests)', mimeType: 'application/json' },
    { uri: 'cortex://snapshots', name: 'Session Snapshots', description: 'Session summaries for context restoration', mimeType: 'application/json' },
  ];

  return {
    listResources: async () => {
      return { resources: RESOURCE_URIS };
    },

    readResource: async (uri) => {
      const str = String(uri);

      return await withDb((db) => {
        let data;
        let mimeType = 'application/json';

        switch (str) {
          case 'cortex://project': {
            const project = db.prepare('SELECT * FROM project WHERE status = ? ORDER BY id DESC LIMIT 1').get('active');
            const features = db.prepare('SELECT * FROM features ORDER BY id').all();
            const todos = db.prepare('SELECT * FROM todos WHERE status = ? ORDER BY priority ASC').all('pending');
            data = { project, features_count: features.length, pending_todos: todos.length, features, todos };
            break;
          }
          case 'cortex://features':
            data = db.prepare('SELECT * FROM features ORDER BY id').all();
            break;
          case 'cortex://files':
            data = db.prepare('SELECT * FROM file_tree ORDER BY id').all();
            break;
          case 'cortex://tests':
            data = db.prepare('SELECT * FROM tests ORDER BY id').all();
            break;
          case 'cortex://issues':
            data = db.prepare('SELECT * FROM issues ORDER BY id DESC').all();
            break;
          case 'cortex://dictionary':
            data = db.prepare('SELECT * FROM dictionary ORDER BY key').all();
            break;
          case 'cortex://progress':
            data = db.prepare('SELECT * FROM progress_log ORDER BY id DESC LIMIT 50').all();
            break;
          case 'cortex://todos':
            data = db.prepare('SELECT * FROM todos WHERE status = ? ORDER BY priority ASC').all('pending');
            break;
          case 'cortex://relationships':
            data = db.prepare('SELECT * FROM relationships ORDER BY id').all();
            break;
          case 'cortex://snapshots':
            data = db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 10').all();
            break;
          default:
            throw new Error(`Unknown resource: ${str}`);
        }

        return {
          contents: [{
            uri: str,
            mimeType,
            text: JSON.stringify(data, null, 2)
          }]
        };
      });
    }
  };
}
