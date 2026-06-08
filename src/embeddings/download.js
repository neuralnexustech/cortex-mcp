import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.join(__dirname, 'models');
const MODEL_NAME = 'bge-micro-v2.onnx';
const MODEL_PATH = path.join(MODELS_DIR, MODEL_NAME);

// bge-micro-v2 ONNX model URL (Hugging Face)
const MODEL_URL = 'https://huggingface.co/nicholasgasior/bge-micro-v2/resolve/main/onnx/model.onnx';

/**
 * Check if the model file exists locally.
 */
export function modelExists() {
  return fs.existsSync(MODEL_PATH) && fs.statSync(MODEL_PATH).size > 1000000;
}

/**
 * Get the path to the model file.
 */
export function getModelPath() {
  return MODEL_PATH;
}

/**
 * Download the bge-micro-v2 ONNX model if not already present.
 * Falls back gracefully if download fails (returns false).
 * @returns {Promise<boolean>} true if model is available
 */
export async function ensureModel() {
  if (modelExists()) return true;

  // Ensure models directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.error(`[Cortex] Downloading ${MODEL_NAME} (~23MB)...`);

  return new Promise((resolve) => {
    const file = fs.createWriteStream(MODEL_PATH);
    const protocol = MODEL_URL.startsWith('https') ? https : http;

    const request = protocol.get(MODEL_URL, { timeout: 120000 }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(MODEL_PATH);
        // Follow redirect
        const protocol2 = response.headers.location.startsWith('https') ? https : http;
        protocol2.get(response.headers.location, { timeout: 120000 }, (response2) => {
          const file2 = fs.createWriteStream(MODEL_PATH);
          response2.pipe(file2);
          file2.on('finish', () => {
            file2.close();
            console.error(`[Cortex] Model downloaded: ${MODEL_PATH}`);
            resolve(true);
          });
          file2.on('error', () => {
            fs.unlinkSync(MODEL_PATH);
            console.error('[Cortex] Model download failed — falling back to FTS5 only');
            resolve(false);
          });
        }).on('error', () => {
          file.close();
          if (fs.existsSync(MODEL_PATH)) fs.unlinkSync(MODEL_PATH);
          console.error('[Cortex] Model download failed — falling back to FTS5 only');
          resolve(false);
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(MODEL_PATH);
        console.error(`[Cortex] Model download failed (HTTP ${response.statusCode}) — falling back to FTS5 only`);
        resolve(false);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.error(`[Cortex] Model downloaded: ${MODEL_PATH}`);
        resolve(true);
      });
    });

    request.on('error', () => {
      file.close();
      if (fs.existsSync(MODEL_PATH)) fs.unlinkSync(MODEL_PATH);
      console.error('[Cortex] Model download failed — falling back to FTS5 only');
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      if (fs.existsSync(MODEL_PATH)) fs.unlinkSync(MODEL_PATH);
      console.error('[Cortex] Model download timed out — falling back to FTS5 only');
      resolve(false);
    });
  });
}
