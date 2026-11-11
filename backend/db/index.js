const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Force IPv4 DNS resolution to prevent ENETUNREACH errors on IPv6-incompatible hosts like Render
  family: 4,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Catch errors on idle clients to prevent crashing the Node process when remote poolers (e.g. Supabase) drop idle sockets
pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool] Idle client connection issue (will reconnect on next query):', err.message || err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  pool,
};
