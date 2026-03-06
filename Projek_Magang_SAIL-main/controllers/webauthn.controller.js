const crypto = require("crypto");
const {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const db = require("../db");

let currentChallenge = null;

exports.loginOptions = async (req, res) => {
  const { email } = req.body;

  const user = await db.query(
    `SELECT u.id, a.credential_id
     FROM users u
     JOIN authenticators a ON u.id = a.user_id
     WHERE u.email=$1`,
    [email]
  );

  if (user.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const options = await generateAuthenticationOptions({
    rpID: "localhost",
    allowCredentials: user.rows.map(r => ({
      id: Buffer.from(r.credential_id, "base64"),
      type: "public-key",
    })),
    userVerification: "required",
  });

  currentChallenge = options.challenge;
  res.json(options);
};

exports.loginVerify = async (req, res) => {
  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: currentChallenge,
      expectedOrigin: "http://localhost:3000",
      expectedRPID: "localhost",
    });

    if (!verification.verified) {
      return res.status(401).json({ message: "Fingerprint gagal" });
    }

    res.json({
      success: true,
      message: "LOGIN BERHASIL 🔓",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
