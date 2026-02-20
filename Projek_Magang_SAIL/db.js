const { Pool } = require('pg');
require('dotenv').config();

// Koneksi untuk Database Login/User (DB yang sudah ada)
const poolAuth = new Pool({
  host: process.env.DB_AUTH_HOST || 'localhost',
  user: process.env.DB_AUTH_USER || 'postgres',
  password: process.env.DB_AUTH_PASSWORD || 'Anoraa',
  database: process.env.DB_AUTH_NAME || 'auth_db', // Ganti dengan nama DB login kamu
  port: process.env.DB_AUTH_PORT || 5432,
});

// Koneksi untuk Database IoT (DB baru kamu)
const poolIoT = new Pool({
  host: process.env.DB_IOT_HOST || 'localhost',
  user: process.env.DB_IOT_USER || 'postgres',
  password: process.env.DB_IOT_PASSWORD || 'Anoraa',
  database: process.env.DB_IOT_NAME || 'SAIL_IoT', // DB khusus IoT
  port: process.env.DB_IOT_PORT || 5432,
});

// test koneksi
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB CONNECT ERROR:', err.message);
  } else {
    console.log('DB CONNECT OK:', res.rows[0]);
  }
});

poolIoT.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('IoT DB CONNECT ERROR:', err.message);
  } else {
    console.log('IoT DB CONNECT OK:', res.rows[0]);
  }
});

module.exports = {
  poolAuth,
  poolIoT
};


