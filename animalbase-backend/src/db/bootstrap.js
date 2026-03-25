const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const appPool = require('./pool');
require('dotenv').config();

function quoteIdentifier(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('DB_NAME is missing or invalid.');
  }
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const dbName = appPool.dbConfig.database;
  const maintenanceDatabase = process.env.DB_MAINTENANCE_DB || 'postgres';
  const maintenancePool = new Pool({
    ...appPool.dbConfig,
    database: maintenanceDatabase,
  });

  let createdDatabase = false;

  try {
    const exists = await maintenancePool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (exists.rowCount === 0) {
      console.warn(`Database "${dbName}" does not exist. Creating it now...`);
      await maintenancePool.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`);
      createdDatabase = true;
      console.log(`Database "${dbName}" created.`);
    }
  } catch (err) {
    if (err.code === '42501') {
      throw new Error(
        `DB user "${appPool.dbConfig.user}" cannot create database "${dbName}". ` +
          'Create the database manually or grant CREATEDB permission.'
      );
    }
    throw err;
  } finally {
    await maintenancePool.end();
  }

  return createdDatabase;
}

async function applySchemaAndSeedAdmin() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@animalbase.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  const client = await appPool.connect();
  try {
    await client.query(schemaSql);

    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rowCount === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `INSERT INTO users (full_name, email, password, role)
         VALUES ($1, $2, $3, 'admin')`,
        ['AnimalBase Admin', adminEmail, hashedPassword]
      );
      console.log(`Admin user created: ${adminEmail}`);
    }
  } finally {
    client.release();
  }
}

async function ensureVerificationSchema() {
  const client = await appPool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS email_verifications (
         email VARCHAR(255) PRIMARY KEY,
         otp_code VARCHAR(10) NOT NULL,
         expires_at TIMESTAMPTZ NOT NULL,
         verified_at TIMESTAMPTZ,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );
  } finally {
    client.release();
  }
}

async function ensureUserNotificationSchema() {
  const client = await appPool.connect();
  try {
    await client.query(
      `ALTER TABLE users
       ADD COLUMN IF NOT EXISTS new_pet_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE`
    );
  } finally {
    client.release();
  }
}

async function ensureApplicationRemarkSchema() {
  const client = await appPool.connect();
  try {
    await client.query(
      `ALTER TABLE adoption_applications
       ADD COLUMN IF NOT EXISTS admin_remark TEXT`
    );
  } finally {
    client.release();
  }
}

async function ensureApplicationUserRetentionSchema() {
  const client = await appPool.connect();
  try {
    await client.query(
      `ALTER TABLE adoption_applications
       ALTER COLUMN user_id DROP NOT NULL`
    );

    const constraintsResult = await client.query(
      `SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
       WHERE n.nspname = 'public'
         AND t.relname = 'adoption_applications'
         AND c.contype = 'f'
         AND a.attname = 'user_id'`
    );

    const hasSetNullConstraint = constraintsResult.rows.some((row) =>
      String(row.definition || '').includes('ON DELETE SET NULL')
    );

    if (!hasSetNullConstraint) {
      for (const row of constraintsResult.rows) {
        await client.query(
          `ALTER TABLE adoption_applications DROP CONSTRAINT ${quoteIdentifier(row.conname)}`
        );
      }

      await client.query(
        `ALTER TABLE adoption_applications
         ADD CONSTRAINT adoption_applications_user_id_fkey
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
      );
    }
  } finally {
    client.release();
  }
}

async function ensureSightingLocationSchema() {
  const client = await appPool.connect();
  try {
    await client.query('ALTER TABLE sightings ADD COLUMN IF NOT EXISTS address TEXT');
    await client.query('ALTER TABLE sightings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION');
    await client.query('ALTER TABLE sightings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION');

    const postgisCheck = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS enabled"
    );

    if (postgisCheck.rows[0]?.enabled) {
      await client.query(
        'ALTER TABLE sightings ADD COLUMN IF NOT EXISTS geo_point geometry(Point, 4326)'
      );
      await client.query(
        'CREATE INDEX IF NOT EXISTS idx_sightings_geo_point ON sightings USING GIST (geo_point)'
      );
    }
  } finally {
    client.release();
  }
}

async function bootstrapDatabase() {
  const createdDatabase = await ensureDatabaseExists();

  if (createdDatabase) {
    console.log('Applying schema and seed data on first database creation...');
    await applySchemaAndSeedAdmin();
    console.log('Initial schema and admin seed applied.');
  }

  await ensureVerificationSchema();
  await ensureUserNotificationSchema();
  await ensureApplicationRemarkSchema();
  await ensureApplicationUserRetentionSchema();
  await ensureSightingLocationSchema();

  return { createdDatabase };
}

module.exports = { bootstrapDatabase };
