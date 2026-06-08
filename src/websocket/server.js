import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

/**
 * Initialize WebSocket server on an existing HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.error(`[Cortex WS] Client connected (${clients.size} total)`);

    ws.on('close', () => {
      clients.delete(ws);
      console.error(`[Cortex WS] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      console.error(`[Cortex WS] Client error: ${err.message}`);
      clients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Cortex WebSocket connected' }));
  });

  console.error('[Cortex WS] WebSocket server initialized on /ws');
  return wss;
}

/**
 * Emit an event to all connected dashboard clients.
 * @param {string} type - event type
 * @param {object} data - event payload
 */
export function emitEvent(type, data) {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify({ type, data, timestamp: Date.now() });

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (err) {
        // Client disconnected
      }
    }
  }
}

/**
 * Emit a confirmation request for destructive actions.
 * Returns a promise that resolves when human responds or times out.
 */
export function emitConfirmRequest(action, target, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const id = `confirm-${Date.now()}`;

    if (clients.size === 0) {
      // No dashboard connected — resolve false immediately
      resolve({ confirmed: false, id, reason: 'no_dashboard' });
      return;
    }

    // Set up response handler
    const handler = (ws) => {
      const messageHandler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'confirm_response' && msg.id === id) {
            cleanup();
            resolve({ confirmed: msg.confirmed, id });
          }
        } catch (err) {
          // Not a valid JSON message
        }
      };
      ws.on('message', messageHandler);
      return messageHandler;
    };

    const handlers = new Map();
    for (const client of clients) {
      if (client.readyState === 1) {
        const h = handler(client);
        handlers.set(client, h);
      }
    }

    // Emit the confirmation request
    emitEvent('confirm_required', { id, action, target });

    // Timeout
    const timeout = setTimeout(() => {
      cleanup();
      resolve({ confirmed: false, id, reason: 'timeout' });
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      for (const [client, h] of handlers) {
        client.removeListener('message', h);
      }
    }
  });
}

/**
 * Get number of connected clients.
 */
export function getClientCount() {
  return clients.size;
}

/**
 * Close WebSocket server.
 */
export function closeWebSocket() {
  if (wss) {
    for (const client of clients) {
      client.close();
    }
    clients.clear();
    wss.close();
    wss = null;
  }
}
