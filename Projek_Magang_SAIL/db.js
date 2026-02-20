const { Pool } = require('pg');
require('dotenv').config(); 

console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// test koneksi
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB CONNECT ERROR:', err.message);
  } else {
    console.log('DB CONNECT OK:', res.rows[0]);
  }
});

module.exports = pool;
