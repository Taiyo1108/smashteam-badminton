const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Force IPv4 DNS resolution to prevent ENETUNREACH errors on IPv6-incompatible hosts like Render
  family: 4,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  pool,
};
