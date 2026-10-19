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
    console.log('Connected. Reading migration SQL...');

    const sqlPath = path.resolve(__dirname, '33_guest_role_and_onboarding.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 33...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Migration 33 completed successfully!');

    // Verification check
    const checkRes = await client.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name IN ('role', 'rating_points', 'matches_played', 'is_profile_completed', 'phone_zalo')
      ORDER BY column_name;
    `);
    console.log('Verified columns in users table:', checkRes.rows);

    const countRes = await client.query(`
      SELECT role, is_profile_completed, count(*) 
      FROM users 
      GROUP BY role, is_profile_completed;
    `);
    console.log('User status breakdown:', countRes.rows);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
