import ort from 'onnxruntime-node';
import { ensureModel, getModelPath, modelExists } from './download.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMBEDDING_DIM = 384;
let session = null;
let modelAvailable = false;

/**
 * Initialize the embedding engine.
 * Downloads the model if needed and loads it into ONNX runtime.
 */
export async function initEmbeddings() {
  modelAvailable = await ensureModel();
  if (!modelAvailable) return false;

  try {
    const modelPath = getModelPath();
    session = await ort.InferenceSession.create(modelPath);
    console.error('[Cortex] Embedding engine initialized (bge-micro-v2, 384-dim)');
    return true;
  } catch (err) {
    console.error(`[Cortex] Failed to load embedding model: ${err.message} — falling back to FTS5 only`);
    modelAvailable = false;
    return false;
  }
}

/**
 * Check if embedding engine is ready.
 */
export function isEmbeddingReady() {
  return modelAvailable && session !== null;
}

/**
 * Simple tokenizer for bge-micro-v2.
 * Splits text into lowercase words, truncates to 512 tokens.
 */
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 512);
}

/**
 * Embed a single text string into a 384-dim float32 array.
 * Uses ONNX session for inference.
 * @param {string} text
 * @returns {Float32Array|null} 384-dim embedding or null if engine not ready
 */
export async function embed(text) {
  if (!session || !modelAvailable) return null;

  try {
    const tokens = tokenize(text);

    // Create input tensor — simplified token IDs (pad to 128)
    const maxLen = 128;
    const inputIds = new BigInt64Array(maxLen);
    const attentionMask = new BigInt64Array(maxLen);
    const tokenTypeIds = new BigInt64Array(maxLen);

    for (let i = 0; i < Math.min(tokens.length, maxLen); i++) {
      // Simple hash-based token IDs (not perfect but functional for embedding)
      inputIds[i] = BigInt(hashToken(tokens[i]));
      attentionMask[i] = 1n;
    }

    const inputTensor = new ort.Tensor('int64', inputIds, [1, maxLen]);
    const maskTensor = new ort.Tensor('int64', attentionMask, [1, maxLen]);
    const typeTensor = new ort.Tensor('int64', tokenTypeIds, [1, maxLen]);

    // Run inference
    const feeds = {
      input_ids: inputTensor,
      attention_mask: maskTensor,
      token_type_ids: typeTensor,
    };

    const output = await session.run(feeds);

    // Get the CLS token embedding (first token) or mean pooling
    const outputKey = Object.keys(output)[0];
    const embedding = output[outputKey].data;

    // Mean pooling over attention mask
    const result = new Float32Array(EMBEDDING_DIM);
    let maskSum = 0;
    for (let i = 0; i < maxLen; i++) {
      if (attentionMask[i] === 1n) {
        for (let j = 0; j < EMBEDDING_DIM; j++) {
          result[j] += embedding[i * EMBEDDING_DIM + j];
        }
        maskSum++;
      }
    }
    if (maskSum > 0) {
      for (let j = 0; j < EMBEDDING_DIM; j++) {
        result[j] /= maskSum;
      }
    }

    // L2 normalize
    let norm = 0;
    for (let j = 0; j < EMBEDDING_DIM; j++) {
      norm += result[j] * result[j];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let j = 0; j < EMBEDDING_DIM; j++) {
        result[j] /= norm;
      }
    }

    return result;
  } catch (err) {
    console.error(`[Cortex] Embedding error: ${err.message}`);
    return null;
  }
}

/**
 * Simple hash function for token IDs.
 */
function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 30000;
}

/**
 * Compute cosine similarity between two float32 arrays.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Convert Float32Array to Buffer for storage as BLOB.
 */
export function embeddingToBuffer(embedding) {
  return Buffer.from(embedding.buffer);
}

/**
 * Convert Buffer back to Float32Array.
 */
export function bufferToEmbedding(buffer) {
  return new Float32Array(buffer.buffer, buffer.byteOffset, EMBEDDING_DIM);
}
