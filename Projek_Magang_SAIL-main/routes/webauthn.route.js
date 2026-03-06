const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../db");

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const challengeStore = {};

/* ================= REGISTER OPTIONS ================= */
router.post("/register/options", async (req, res) => {
  try {
    const { user_id, email } = req.body;

    if (!user_id || !email) {
      return res.status(400).json({ message: "user_id and email required" });
    }

    const userID = crypto
      .createHash("sha256")
      .update(user_id.toString())
      .digest();

    const options = await generateRegistrationOptions({
      rpName: "SAIL System",
      rpID: "localhost",
      userID,
      userName: email,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      attestationType: "none",
    });

    challengeStore[user_id] = options.challenge;
    res.json(options);
  } catch (err) {
    console.error("REGISTER OPTIONS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= REGISTER VERIFY ================= */
router.post("/register/verify", async (req, res) => {
  try {
    const { user_id, credential } = req.body;

    if (!user_id || !credential) {
      return res.status(400).json({ message: "user_id and credential required" });
    }

    const expectedChallenge = challengeStore[user_id];
    if (!expectedChallenge) {
      return res.status(400).json({ message: "No challenge found, restart registration" });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: "http://localhost:3000",
      expectedRPID: "localhost",
    });

    if (!verification.verified) {
      return res.status(400).json({ message: "Fingerprint verification failed" });
    }

    const { credential: cred } = verification.registrationInfo;

    // ✅ In v13, cred.id is already a base64url string
    // ✅ cred.publicKey is a Uint8Array — save as base64url
    const credentialId = cred.id;
    const publicKeyBase64 = Buffer.from(cred.publicKey).toString("base64url");
    const counter = cred.counter ?? 0;

    console.log("Saving credential_id:", credentialId);
    console.log("Type:", typeof credentialId);

    const existing = await pool.query(
      `SELECT id FROM webauthn_credentials WHERE credential_id = $1`,
      [credentialId]
    );

    if (existing.rows.length > 0) {
      delete challengeStore[user_id];
      return res.json({ success: true, message: "Fingerprint already registered" });
    }

    await pool.query(
      `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
       VALUES ($1, $2, $3, $4)`,
      [user_id, credentialId, publicKeyBase64, counter]
    );

    delete challengeStore[user_id];
    res.json({ success: true, message: "Fingerprint registered successfully!" });
  } catch (err) {
    console.error("REGISTER VERIFY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= LOGIN OPTIONS ================= */
router.post("/login/options", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "user_id required" });
    }

    const result = await pool.query(
      `SELECT credential_id FROM webauthn_credentials WHERE user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "No fingerprint registered for this user" });
    }

    const credentialId = result.rows[0].credential_id;
    console.log("RAW credential_id from DB:", credentialId);
    console.log("Type:", typeof credentialId);

    const options = await generateAuthenticationOptions({
      rpID: "localhost",
      allowCredentials: result.rows.map((r) => ({
        id: r.credential_id,  // ✅ must be a base64url string
        type: "public-key",
      })),
      userVerification: "required",
      timeout: 60000,
    });

    challengeStore[user_id] = options.challenge;
    res.json(options);

  } catch (err) {
    console.error("LOGIN OPTIONS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= LOGIN VERIFY ================= */
router.post("/login/verify", async (req, res) => {
  try {
    const { user_id, id, rawId, type, response } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "user_id required" });
    }

    const expectedChallenge = challengeStore[user_id];
    if (!expectedChallenge) {
      return res.status(400).json({ message: "No challenge found, restart login" });
    }

    const result = await pool.query(
      `SELECT credential_id, public_key, counter
       FROM webauthn_credentials
       WHERE user_id = $1 AND credential_id = $2`,
      [user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Credential not found" });
    }

    const storedCred = result.rows[0];

    const verification = await verifyAuthenticationResponse({
      response: { id, rawId, type, response },
      expectedChallenge,
      expectedOrigin: "http://localhost:3000",
      expectedRPID: "localhost",
      credential: {
        id: storedCred.credential_id,
        // ✅ public_key was saved as base64url, decode the same way
        publicKey: Buffer.from(storedCred.public_key, "base64url"),
        counter: storedCred.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, message: "Fingerprint tidak cocok" });
    }

    await pool.query(
      `UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2`,
      [verification.authenticationInfo.newCounter, id]
    );

    delete challengeStore[user_id];

    const userResult = await pool.query(
      `SELECT id, email FROM users WHERE id = $1`,
      [user_id]
    );

    res.json({
      success: true,
      message: "Login berhasil!",
      user: userResult.rows[0],
    });
  } catch (err) {
    console.error("LOGIN VERIFY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;