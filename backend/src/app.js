require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeFirebase } = require('./config/firebase');

const app = express();

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AnimalBase API is running', version: '1.0.0' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/missing-pets', require('./routes/missingPets'));
app.use('/api/sightings', require('./routes/sightings'));
app.use('/api/adoptions', require('./routes/adoptions'));
app.use('/api/encyclopedia', require('./routes/encyclopedia'));
app.use('/api/notifications', require('./routes/notifications'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AnimalBase API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
