/**
 * Audit trail — structured logging for every tool call
 * Records who/what/when/why for compliance and debugging.
 */

export function createAuditLogger(db) {
  // Create audit_log table if not exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY,
      tool_name TEXT NOT NULL,
      agent TEXT,
      session_id TEXT,
      input_summary TEXT,
      output_status TEXT,
      duration_ms INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare('CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool_name)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)').run();

  return {
    /**
     * Log a tool call
     */
    log(toolName, { agent, sessionId, inputSummary, outputStatus, durationMs, errorMessage }) {
      try {
        db.prepare(
          'INSERT INTO audit_log (tool_name, agent, session_id, input_summary, output_status, duration_ms, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          toolName,
          agent || null,
          sessionId || null,
          inputSummary ? String(inputSummary).substring(0, 500) : null,
          outputStatus || 'ok',
          durationMs || null,
          errorMessage || null
        );
      } catch (_) {
        // Audit log failure should never crash the server
      }
    },

    /**
     * Get recent audit entries
     */
    getRecent(limit = 50) {
      return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit);
    },

    /**
     * Get audit entries by tool
     */
    getByTool(toolName, limit = 20) {
      return db.prepare('SELECT * FROM audit_log WHERE tool_name = ? ORDER BY id DESC LIMIT ?').all(toolName, limit);
    },

    /**
     * Get audit stats
     */
    getStats() {
      const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get();
      const byTool = db.prepare('SELECT tool_name, COUNT(*) as count FROM audit_log GROUP BY tool_name ORDER BY count DESC').all();
      const errors = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE output_status = ?').get('error');
      const avgDuration = db.prepare('SELECT AVG(duration_ms) as avg_ms FROM audit_log WHERE duration_ms IS NOT NULL').get();
      return {
        total: total?.count || 0,
        errors: errors?.count || 0,
        avg_duration_ms: Math.round(avgDuration?.avg_ms || 0),
        by_tool: byTool
      };
    }
  };
}
