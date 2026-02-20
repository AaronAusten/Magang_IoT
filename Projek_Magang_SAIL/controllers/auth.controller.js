const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolAuth } = require('../db'); // Menggunakan pool khusus Auth
require('dotenv').config();

// --- REGISTER ---
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    // Cek apakah email sudah terdaftar di poolAuth
    const existingUser = await poolAuth.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke database auth
    await poolAuth.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, hashedPassword]
    );

    return res.status(201).json({ message: 'Register berhasil' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error pada database autentikasi' });
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Cari user di poolAuth
    const userResult = await poolAuth.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const user = userResult.rows[0];

    // 2. Cek Password dengan Bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // 3. Buat JWT Token
    // Pastikan kamu punya JWT_SECRET di file .env
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'SAIL_SECRET_KEY_123',
      { expiresIn: '24h' }
    );

    // 4. Kirim respon sukses
    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error pada database autentikasi' });
  }
};

// --- LOGOUT (Optional - Sisi Client biasanya hanya hapus token) ---
exports.logout = (req, res) => {
  return res.status(200).json({ message: 'Logout berhasil' });
};