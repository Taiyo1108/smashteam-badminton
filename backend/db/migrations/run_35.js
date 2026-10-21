const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    family: 4
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected. Reading migration SQL 35...');

    const sqlPath = path.resolve(__dirname, '35_guest_reservation_penalty_and_blacklist.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 35...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Migration 35 completed successfully!');

    // Verification check
    const checkRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'guest_blacklist';
    `);
    console.log('Verified table guest_blacklist:', checkRes.rows);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
