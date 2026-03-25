// Run with: npm run db:init
// This creates the admin user after schema.sql has been run in pgAdmin4

const pool   = require('./pool');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function init() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initialising database...');

    // Check if admin exists
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [process.env.ADMIN_EMAIL]
    );

    if (existing.rows.length === 0) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await client.query(
        `INSERT INTO users (full_name, email, password, role)
         VALUES ($1, $2, $3, 'admin')`,
        ['AnimalBase Admin', process.env.ADMIN_EMAIL, hashed]
      );
      console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
    } else {
      console.log('ℹ️  Admin already exists, skipping.');
    }

    console.log('✅ Database initialisation complete!');
  } catch (err) {
    console.error('❌ Init error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

init();