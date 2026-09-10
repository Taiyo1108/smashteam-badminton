const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure JWT_SECRET is always present so auth never crashes
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smashteam_secret_jwt_2026';

let query;
let connect;
let pool;

const hasValidRemoteDb = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('user:password@localhost') &&
  !process.env.DATABASE_URL.includes('username:password@host');

if (hasValidRemoteDb) {
  // Use remote PostgreSQL (Supabase / Render / Neon)
  const { Pool } = require('pg');
  console.log('[Database] Kết nối đến PostgreSQL từ xa qua DATABASE_URL...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    family: 4,
  });
  query = (text, params) => pool.query(text, params);
  connect = () => pool.connect();
} else {
  // Use embedded persistent PGlite PostgreSQL (No external server needed!)
  const { PGlite } = require('@electric-sql/pglite');
  const { setupLocalDb } = require('./setup-local-db');
  
  const dataDir = path.join(__dirname, '..', 'local_pgdata');
  console.log(`[Database] Sử dụng Embedded PostgreSQL (PGlite) tại: ${dataDir}`);
  const pglite = new PGlite(dataDir);

  // Auto-init schema if not yet setup
  setupLocalDb(pglite).catch(err => console.error('[Database Setup Error]:', err));

  const client = {
    query: (text, params) => pglite.query(text, params),
    release: () => {},
  };

  pool = {
    query: (text, params) => pglite.query(text, params),
    connect: async () => client,
  };

  query = (text, params) => pglite.query(text, params);
  connect = async () => client;
}

module.exports = {
  query,
  connect,
  pool,
};
