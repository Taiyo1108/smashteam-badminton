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

  // Tự động dọn dẹp file lock postmaster.pid cũ nếu có trước khi khởi tạo PGlite
  const pidPath = path.join(dataDir, 'postmaster.pid');
  if (fs.existsSync(pidPath)) {
    try {
      fs.unlinkSync(pidPath);
      console.log('[Database] Đã dọn dẹp file lock cũ postmaster.pid thành công.');
    } catch (e) {
      console.warn('[Database] Cảnh báo khi dọn postmaster.pid:', e.message);
    }
  }

  const pglite = new PGlite(dataDir);

  let isReady = false;
  const readyPromise = (async () => {
    try {
      await pglite.waitReady;
      await setupLocalDb(pglite);
      isReady = true;
      console.log('✅ [Database] PGlite & Schema đã sẵn sàng phục vụ!');
    } catch (err) {
      console.error('❌ [Database Setup Error]:', err);
    }
  })();

  const executeQuery = async (text, params) => {
    if (!isReady) {
      await readyPromise;
    }
    return pglite.query(text, params);
  };

  const client = {
    query: executeQuery,
    release: () => {},
  };

  pool = {
    query: executeQuery,
    connect: async () => client,
  };

  query = executeQuery;
  connect = async () => client;
}

module.exports = {
  query,
  connect,
  pool,
};
