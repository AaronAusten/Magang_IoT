const bcrypt = require('bcrypt');
const pool = require('../db');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validasi
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email dan password wajib diisi',
      });
    }

    // cek email
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Email sudah terdaftar',
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, hashedPassword]
    );

    return res.status(201).json({
      message: 'Register berhasil',
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({
      message: 'Server error',
    });
  }
};