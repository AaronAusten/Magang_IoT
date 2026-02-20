const { poolIoT } = require('../db'); // Ambil poolIoT saja

exports.getAllLatestData = async (req, res) => {
  try {
    const patroli = await poolIoT.query('SELECT * FROM laporan_patroli ORDER BY waktu DESC LIMIT 5');
    const waterLevel = await poolIoT.query('SELECT * FROM laporan_water_level ORDER BY waktu DESC LIMIT 5');
    const waterFlow = await poolIoT.query('SELECT * FROM laporan_water_flow ORDER BY waktu DESC LIMIT 5');
    const lingkungan = await poolIoT.query('SELECT * FROM laporan_lingkungan ORDER BY waktu DESC LIMIT 5');

    res.json({
      patroli: patroli.rows,
      waterLevel: waterLevel.rows,
      waterFlow: waterFlow.rows,
      lingkungan: lingkungan.rows
    });
  } catch (err) {
    console.error("Error IoT DB:", err);
    res.status(500).send("Database IoT Error");
  }
};

// ── Laporan Water Level ──────────────────────────────────────────────
const getWaterLevel = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_water_level ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getWaterLevel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLatestWaterLevel = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_water_level ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('getLatestWaterLevel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Laporan Water Flow ───────────────────────────────────────────────
const getWaterFlow = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_water_flow ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getWaterFlow error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLatestWaterFlow = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_water_flow ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('getLatestWaterFlow error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Laporan Lingkungan (Suhu, Kelembapan, Gas) ───────────────────────
const getLingkungan = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_lingkungan ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getLingkungan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLatestLingkungan = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_lingkungan ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('getLatestLingkungan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Laporan Patroli ──────────────────────────────────────────────────
const getPatroli = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM laporan_patroli ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getPatroli error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Summary semua sensor (untuk card utama dashboard) ────────────────
const getDashboardSummary = async (req, res) => {
  try {
    const [waterLevel, waterFlow, lingkungan, patroli] = await Promise.all([
      db.query(`SELECT * FROM laporan_water_level ORDER BY created_at DESC LIMIT 1`),
      db.query(`SELECT * FROM laporan_water_flow ORDER BY created_at DESC LIMIT 1`),
      db.query(`SELECT * FROM laporan_lingkungan ORDER BY created_at DESC LIMIT 1`),
      db.query(`SELECT COUNT(*) as total FROM laporan_patroli`),
    ]);

    res.json({
      success: true,
      data: {
        water_level: waterLevel.rows[0] || null,
        water_flow: waterFlow.rows[0] || null,
        lingkungan: lingkungan.rows[0] || null,
        total_patroli: patroli.rows[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getWaterLevel,
  getLatestWaterLevel,
  getWaterFlow,
  getLatestWaterFlow,
  getLingkungan,
  getLatestLingkungan,
  getPatroli,
  getDashboardSummary,
};