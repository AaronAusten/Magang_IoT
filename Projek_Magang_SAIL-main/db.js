const { Pool } = require('pg');
require('dotenv').config();

console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);

const dbConfig = {
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT,
};

// Main pool — used by auth.route.js and webauthn.route.js
const pool = new Pool(dbConfig);

// IoT pool — used by iotController.js
const poolIoT = new Pool(dbConfig);

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB CONNECT ERROR:', err.message);
  } else {
    console.log('DB CONNECT OK:', res.rows[0]);
  }
});

// ✅ Default export (pool) — for: const pool = require('../db')
// ✅ Named export (poolIoT) — for: const { poolIoT } = require('../db')
module.exports = pool;
module.exports.poolIoT = poolIoT;