require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/pool');
const { bootstrapDatabase } = require('./db/bootstrap');
const { initMailer } = require('./controllers/authController');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(
  cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/lost-pets', require('./routes/lostPets'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/compat'));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Uploaded image must be 10MB or smaller.' });
    }

    return res.status(400).json({ error: err.message || 'Invalid file upload.' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  try {
    const { createdDatabase } = await bootstrapDatabase();
    await pool.query('SELECT 1');

    app.listen(PORT, HOST, () => {
      console.log(`AnimalBase API running on http://${HOST}:${PORT}`);
      console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database    : ${process.env.DB_NAME}@${process.env.DB_HOST}`);

      if (createdDatabase) {
        console.log('Database bootstrap completed on startup.');
      }

      initMailer().catch((err) => {
        console.error('SMTP startup check failed:', err.message);
      });
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
