/**
 * Episodic memory — timestamped event tracking across sessions
 * Records what happened, when, and in what context.
 * Complements snapshots (summaries) with granular event history.
 */

export function createEpisodicMemory(db) {
  // Create episodic_memory table if not exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS episodic_memory (
      id INTEGER PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      entity_name TEXT,
      context TEXT,
      session_id TEXT,
      agent TEXT,
      importance INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare('CREATE INDEX IF NOT EXISTS idx_episodic_type ON episodic_memory(event_type)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_episodic_entity ON episodic_memory(entity_type, entity_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_episodic_session ON episodic_memory(session_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_episodic_created ON episodic_memory(created_at)').run();

  return {
    /**
     * Record an event
     */
    record({ eventType, eventName, entityType, entityId, entityName, context, sessionId, agent, importance }) {
      try {
        db.prepare(
          'INSERT INTO episodic_memory (event_type, event_name, entity_type, entity_id, entity_name, context, session_id, agent, importance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          eventType, // 'feature_created', 'file_modified', 'issue_resolved', 'decision_made', 'task_completed', 'session_started', 'session_ended'
          eventName,
          entityType || null,
          entityId || null,
          entityName || null,
          context || null,
          sessionId || null,
          agent || null,
          importance || 5
        );
      } catch (_) {}
    },

    /**
     * Get recent events
     */
    getRecent(limit = 30) {
      return db.prepare('SELECT * FROM episodic_memory ORDER BY id DESC LIMIT ?').all(limit);
    },

    /**
     * Get events by session
     */
    getBySession(sessionId) {
      return db.prepare('SELECT * FROM episodic_memory WHERE session_id = ? ORDER BY created_at ASC').all(sessionId);
    },

    /**
     * Get events by entity
     */
    getByEntity(entityType, entityId) {
      return db.prepare('SELECT * FROM episodic_memory WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId);
    },

    /**
     * Get timeline (grouped by day)
     */
    getTimeline(days = 7) {
      return db.prepare(`
        SELECT DATE(created_at) as day, COUNT(*) as event_count,
               GROUP_CONCAT(event_name, ' | ') as events
        FROM episodic_memory
        WHERE created_at >= datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY day DESC
      `).all(`-${days} days`);
    },

    /**
     * Get important events (importance >= 7)
     */
    getImportant(limit = 20) {
      return db.prepare('SELECT * FROM episodic_memory WHERE importance >= 7 ORDER BY id DESC LIMIT ?').all(limit);
    },

    /**
     * Search events
     */
    search(query) {
      return db.prepare(
        'SELECT * FROM episodic_memory WHERE event_name LIKE ? OR context LIKE ? OR entity_name LIKE ? ORDER BY id DESC LIMIT 20'
      ).all(`%${query}%`, `%${query}%`, `%${query}%`);
    }
  };
}
