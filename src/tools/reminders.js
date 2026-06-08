import * as queries from '../db/queries.js';

export function registerReminderTools(server, withDb) {
  server.tool(
    'cortex_check_reminders',
    'Run all 6 reminder checks — returns list of warnings/blocks based on real DB state',
    {},
    async () => {
      return withDb((db) => {
        const reminders = [];

        // ─── Rule 1: File created/done but no test linked ─────────────────────
        // A file marked done with no test_id AND no test in the tests table references it
        const files = queries.getFiles(db);
        const tests = queries.getTests(db);
        for (const file of files) {
          if (file.status === 'done') {
            const hasTest = tests.some(t => String(t.file_id) === String(file.id));
            if (!hasTest) {
              reminders.push({
                type: 'warning',
                rule: 1,
                message: `You created "${file.file_path}" but test is missing. Add test before continuing.`
              });
            }
          }
        }

        // ─── Rule 2: Feature marked done but test failed ───────────────────────
        const features = queries.getFeatures(db);
        for (const feature of features) {
          if (feature.status === 'done') {
            const featureTests = tests.filter(t => String(t.feature_id) === String(feature.id));
            const failedTest = featureTests.find(t => t.status === 'failed');
            if (failedTest) {
              reminders.push({
                type: 'block',
                rule: 2,
                message: `Feature "${feature.name}" marked done but test "${failedTest.name}" is failing. Fix before next task.`
              });
            }
          }
        }

        // ─── Rule 3: Library used in research-less entries ─────────────────────
        // Check dictionary for entries that look like library imports
        // but have no matching research entry
        const research = queries.getResearch(db);
        const researchLibs = new Set(research.map(r => r.library_name.toLowerCase()));

        const dictEntries = queries.getDictionary(db);
        for (const entry of dictEntries) {
          // Look for library mentions in the short_summary or full_description
          const text = `${entry.short_summary || ''} ${entry.full_description || ''}`.toLowerCase();
          // Common patterns: "uses X library", "import X", "require X"
          const importMatches = text.match(/(?:uses?|import(?:s|ed)?|require(?:s|d)?)\s+([a-z][a-z0-9_-]{1,30})/g) || [];
          for (const match of importMatches) {
            const libMatch = match.match(/\s+([a-z][a-z0-9_-]{1,30})$/);
            if (libMatch) {
              const libName = libMatch[1];
              // Skip common non-library words
              const commonWords = new Set(['the', 'a', 'an', 'it', 'this', 'that', 'to', 'from', 'and', 'or', 'of', 'in', 'for', 'file', 'module', 'function', 'class']);
              if (!commonWords.has(libName) && !researchLibs.has(libName)) {
                reminders.push({
                  type: 'warn',
                  rule: 3,
                  message: `Library "${libName}" appears to be used but has no research entry. Research it first with cortex_add_research.`
                });
                break; // one warning per entry is enough
              }
            }
          }
        }

        // ─── Rule 4: Open issues exist ─────────────────────────────────────────
        const issues = queries.getIssues(db);
        const openIssues = issues.filter(i => i.status === 'open');
        if (openIssues.length > 0) {
          const issueTitles = openIssues.slice(0, 3).map(i => `"${i.title}"`).join(', ');
          reminders.push({
            type: 'block',
            rule: 4,
            message: `${openIssues.length} open issue(s): ${issueTitles}. Fix before building new features.`
          });
        }

        // ─── Rule 5: 3+ tasks done since last progress log entry ───────────────
        // Count completed todos and compare timestamps with last progress log
        const allTodos = db.prepare("SELECT * FROM todos ORDER BY completed_at DESC").all();
        const completedTodos = allTodos.filter(t => t.status === 'completed' && t.completed_at);
        const progress = queries.getProgress(db);
        const lastProgressTime = progress.length > 0 ? progress[0].created_at : null;

        if (completedTodos.length >= 3 && lastProgressTime) {
          const recentCompleted = completedTodos.filter(t => t.completed_at > lastProgressTime);
          if (recentCompleted.length >= 3) {
            reminders.push({
              type: 'warning',
              rule: 5,
              message: `You completed ${recentCompleted.length} tasks since your last progress log. Log progress now with cortex_log_progress.`
            });
          }
        } else if (completedTodos.length >= 3 && !lastProgressTime) {
          reminders.push({
            type: 'warning',
            rule: 5,
            message: `You have ${completedTodos.length} completed tasks but no progress log entries. Log progress with cortex_log_progress.`
          });
        }

        // ─── Rule 6: All tasks complete ───────────────────────────────────────
        const pendingTodos = queries.getTodos(db);
        if (pendingTodos.length === 0 && features.length > 0) {
          const allDone = features.every(f => f.status === 'done');
          if (allDone) {
            reminders.push({
              type: 'success',
              rule: 6,
              message: 'All tasks done. Project complete. Stopping.'
            });
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              reminders,
              count: reminders.length,
              has_blocks: reminders.some(r => r.type === 'block'),
              has_warnings: reminders.some(r => r.type === 'warning')
            }, null, 2)
          }]
        };
      });
    }
  );
}
