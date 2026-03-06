const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email, hashed]
    );

    res.json({
      message: "Register success!",
      user_id: result.rows[0].id
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }

    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Password salah" });
    }

    res.json({
      message: "Login Success!",
      user_id: user.id,
      email: user.email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= CHANGE PASSWORD =================
router.post('/change-password', async (req, res) => {
  try {
    // Step 1 — Get data sent from the frontend form
    const { user_id, old_password, new_password } = req.body;

    // Step 2 — Make sure none of the fields are empty
    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Step 3 — New password must be at least 6 characters
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Step 4 — Find the user in PostgreSQL by their user_id
    const result = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user_id]
    );

    // Step 5 — If no user found with that ID, stop here
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 6 — Check if old_password matches the stored hash
    // bcrypt.compare does this safely — it never stores the plain password
    const passwordMatches = await bcrypt.compare(old_password, result.rows[0].password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Step 7 — Hash the new password (10 = how many times to scramble it, more = safer but slower)
    const newHash = await bcrypt.hash(new_password, 10);

    // Step 8 — Save the new hashed password into the database
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, user_id]
    );

    // Step 9 — Tell the frontend it worked
    res.json({ success: true, message: 'Password changed successfully!' });

  } catch (err) {
    console.error('CHANGE PASSWORD ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});
module.exports = router;
