import { z } from 'zod';
import { isEmbeddingReady, embed, cosineSimilarity, embeddingToBuffer, bufferToEmbedding } from '../embeddings/engine.js';

const FTS_TABLES = {
  dictionary: { fts: 'dictionary_fts', columns: ['key', 'short_summary', 'full_description'], label: 'Dictionary' },
  issues: { fts: 'issues_fts', columns: ['title', 'description', 'cause', 'fix_applied'], label: 'Issues' },
  snippets: { fts: 'snippets_fts', columns: ['title', 'code', 'tags', 'description'], label: 'Snippets' },
  research: { fts: 'research_fts', columns: ['library_name', 'notes'], label: 'Research' },
  progress: { fts: 'progress_fts', columns: ['task', 'notes'], label: 'Progress' },
};

const SOURCE_TABLE_MAP = {
  dictionary: 'dictionary',
  issues: 'issues',
  snippets: 'snippets',
  research: 'research',
  progress: 'progress_log',
};

/**
 * FTS5 keyword search.
 */
function searchFTS(db, query, tables) {
  const results = [];
  const searchTables = tables || Object.keys(FTS_TABLES);

  for (const tableName of searchTables) {
    const config = FTS_TABLES[tableName];
    if (!config) continue;

    try {
      const ftsQuery = query.includes(' ') ? `"${query}"` : query;
      const sql = `SELECT rowid, * FROM ${config.fts} WHERE ${config.fts} MATCH ? ORDER BY rank LIMIT 10`;
      const rows = db.prepare(sql).all(ftsQuery);

      for (const row of rows) {
        const snippetParts = [];
        for (const col of config.columns) {
          if (row[col]) snippetParts.push(row[col].substring(0, 120));
        }
        results.push({
          table: tableName,
          table_label: config.label,
          id: row.rowid,
          title: row[config.columns[0]] || `#${row.rowid}`,
          snippet: snippetParts.join(' | ').substring(0, 200),
          fts_score: 1 / (1 + Math.abs(row.rank || 0)),
          vector_score: 0,
          mode: 'fts',
        });
      }
    } catch (err) {
      // FTS query syntax error — skip
    }
  }

  return results;
}

/**
 * Vector similarity search across all embeddings.
 */
async function searchVector(db, queryEmbedding, tables) {
  if (!isEmbeddingReady() || !queryEmbedding) return [];

  const results = [];
  const searchTables = tables || Object.keys(SOURCE_TABLE_MAP);

  for (const tableName of searchTables) {
    const sourceTable = SOURCE_TABLE_MAP[tableName];
    if (!sourceTable) continue;

    try {
      const embeddings = db.prepare(
        'SELECT id, source_id, embedding FROM embeddings WHERE source_table = ?'
      ).all(sourceTable);

      for (const emb of embeddings) {
        const storedEmbedding = bufferToEmbedding(emb.embedding);
        const score = cosineSimilarity(queryEmbedding, storedEmbedding);

        if (score > 0.3) {
          results.push({
            table: tableName,
            table_label: FTS_TABLES[tableName]?.label || tableName,
            id: emb.source_id,
            title: '',
            snippet: '',
            fts_score: 0,
            vector_score: score,
            mode: 'vector',
          });
        }
      }
    } catch (err) {
      // embeddings table might not have this source_table yet
    }
  }

  return results;
}

/**
 * Reciprocal Rank Fusion — combines FTS and vector results.
 * RRF_score = sum(1 / (k + rank_i)) for each ranking list.
 * k=60 is standard.
 */
function rrfFuse(ftsResults, vectorResults, k = 60) {
  const combined = new Map();

  // Add FTS results
  ftsResults.forEach((r, index) => {
    const key = `${r.table}:${r.id}`;
    const existing = combined.get(key) || { ...r, rrf_score: 0 };
    existing.rrf_score += 1 / (k + index + 1);
    existing.fts_score = r.fts_score;
    combined.set(key, existing);
  });

  // Add vector results
  vectorResults.forEach((r, index) => {
    const key = `${r.table}:${r.id}`;
    const existing = combined.get(key) || { ...r, rrf_score: 0 };
    existing.rrf_score += 1 / (k + index + 1);
    existing.vector_score = r.vector_score;
    if (!existing.title) existing.title = r.title;
    if (!existing.snippet) existing.snippet = r.snippet;
    combined.set(key, existing);
  });

  // Sort by RRF score descending
  return Array.from(combined.values())
    .sort((a, b) => b.rrf_score - a.rrf_score)
    .slice(0, 20);
}

/**
 * Store an embedding for a source record.
 */
export async function storeEmbedding(db, sourceTable, sourceId, text) {
  if (!isEmbeddingReady()) return false;

  const embedding = await embed(text);
  if (!embedding) return false;

  const buffer = embeddingToBuffer(embedding);
  db.prepare(
    'INSERT OR REPLACE INTO embeddings (source_table, source_id, embedding) VALUES (?, ?, ?)'
  ).run(sourceTable, sourceId, buffer);
  return true;
}

/**
 * Register cortex_search tool with FTS5 + vector hybrid support.
 */
export function registerSearchTools(server, withDb) {
  server.tool(
    'cortex_search',
    'Search across dictionary, issues, snippets, research, and progress. Supports keyword (FTS5), semantic (vector), and hybrid (RRF fusion) modes. Returns ranked results with source table, id, and matched snippet.',
    {
      query: z.string().describe('Search query'),
      mode: z.string().optional().describe('Search mode: keyword, semantic, or hybrid (default: hybrid)'),
      tables: z.array(z.string()).optional().describe('Limit search to specific tables: dictionary, issues, snippets, research, progress'),
    },
    async (args) => {
      return await withDb(async (db) => {
        const query = args.query;
        const mode = args.mode || 'hybrid';
        const tables = args.tables || null;

        if (!query || query.trim().length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Query is required' }) }] };
        }

        let results = [];

        if (mode === 'keyword') {
          // FTS5 only
          results = searchFTS(db, query, tables);
        } else if (mode === 'semantic') {
          // Vector only
          const queryEmbedding = await embed(query);
          results = await searchVector(db, queryEmbedding, tables);
          // Enrich with titles from main tables
          for (const r of results) {
            const record = db.prepare(`SELECT * FROM ${SOURCE_TABLE_MAP[r.table]} WHERE id = ?`).get(r.id);
            if (record) {
              r.title = record[Object.keys(record)[1]] || `#${r.id}`;
              r.snippet = JSON.stringify(record).substring(0, 200);
            }
          }
        } else {
          // Hybrid: FTS5 + vector with RRF fusion
          const ftsResults = searchFTS(db, query, tables);
          const queryEmbedding = await embed(query);
          const vectorResults = await searchVector(db, queryEmbedding, tables);
          results = rrfFuse(ftsResults, vectorResults);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query,
              mode,
              result_count: results.length,
              results: results.slice(0, 15),
              embedding_available: isEmbeddingReady(),
            }, null, 2)
          }]
        };
      });
    }
  );
}

export { searchFTS, searchVector, rrfFuse };
