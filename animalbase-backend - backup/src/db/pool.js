const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'animalbase',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const pool = new Pool(dbConfig);
pool.dbConfig = dbConfig;

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('PostgreSQL connected');
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err.message);
});

module.exports = pool;
