/**
 * AnimalBase API Server
 * Stack: Node.js + Express + PostgreSQL + WebSocket (ws)
 * No Firebase / no third-party paid services.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { initWebSocket } = require('./config/websocket');

const app = express();
const httpServer = http.createServer(app);   // ← share one HTTP server with WS

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (profile photos, pet images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AnimalBase API is running',
    version: '2.0.0',
    notifications: 'WebSocket + PostgreSQL (no Firebase)',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/pets',         require('./routes/pets'));
app.use('/api/missing-pets', require('./routes/missingPets'));
app.use('/api/sightings',    require('./routes/sightings'));
app.use('/api/adoptions',    require('./routes/adoptions'));
app.use('/api/encyclopedia', require('./routes/encyclopedia'));
app.use('/api/notifications',require('./routes/notifications'));

// ── 404 & global error ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`AnimalBase API  → http://0.0.0.0:${PORT}/api/health`);
  console.log(`WebSocket       → ws://0.0.0.0:${PORT}/ws?token=JWT`);
  // Attach WebSocket after server is listening
  initWebSocket(httpServer);
});

module.exports = app;
