/**
 * websocket.js — Real-time notification delivery via WebSocket
 *
 * Replaces Firebase Cloud Messaging entirely.
 * Uses the built-in `ws` package (zero cost, zero third-party service).
 *
 * How it works:
 *   1. Android app connects to  ws://YOUR_HOST:3000/ws?token=JWT
 *   2. Server authenticates the token and maps userId → WebSocket connection
 *   3. When a notification is created, it is delivered instantly via WebSocket
 *   4. Android app also polls /api/notifications on resume as a fallback
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Map: userId (number) → Set of active WebSocket connections
const clients = new Map();

let wss = null;

/**
 * Attach the WebSocket server to the existing HTTP server.
 * Called once from app.js after httpServer.listen().
 */
function initWebSocket(httpServer) {
  wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via ?token= query param
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let userId = null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Register this connection
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(ws);
    console.log(`WS: user ${userId} connected (${clients.get(userId).size} sockets)`);

    // Heartbeat — keep connection alive through NAT/proxies
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      const set = clients.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(userId);
      }
      console.log(`WS: user ${userId} disconnected`);
    });

    ws.on('error', () => {});

    // Confirm connection
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket ready' }));
  });

  // Ping every 30 s — drop dead connections
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  console.log('WebSocket server initialised on /ws');
}

/**
 * Push a notification payload to all active sockets for a user.
 * Silently skips if the user has no active connections
 * (Android app will pick it up on next /api/notifications poll).
 *
 * @param {number} userId
 * @param {object} payload  { type, title, message, related_id? }
 */
function pushToUser(userId, payload) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const data = JSON.stringify({ type: 'notification', ...payload });
  set.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data, err => { if (err) console.warn('WS send error:', err.message); });
    }
  });
  console.log(`WS: pushed notification to user ${userId}`);
}

module.exports = { initWebSocket, pushToUser };
