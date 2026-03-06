// iotController.js
const { poolIoT } = require('../db');

const LIMIT = 100;

// ════════════════════════════════════════════════════
//  GET /api/iot/dashboard/summary
// ════════════════════════════════════════════════════
async function getSummary(req, res) {
  try {
    const [wlRes, wfRes, envRes, patTotalRes, patListRes] = await Promise.all([
      poolIoT.query('SELECT id, s1, s2, p1, p2, created_at FROM laporan_water_level ORDER BY created_at DESC LIMIT 1'),
      poolIoT.query('SELECT id, rate, total, created_at FROM laporan_water_flow ORDER BY created_at DESC LIMIT 1'),
      poolIoT.query('SELECT id, t, h, raw, stat, created_at FROM laporan_lingkungan ORDER BY created_at DESC LIMIT 1'),
      poolIoT.query("SELECT COUNT(*) AS total FROM laporan_patroli WHERE created_at >= CURRENT_DATE"),
      poolIoT.query(
        `SELECT DISTINCT ON (pos) id, pos, status, created_at
         FROM laporan_patroli
         WHERE created_at >= CURRENT_DATE
         ORDER BY pos, created_at DESC`
      ),
    ]);

    res.json({
      success: true,
      data: {
        water_level: wlRes.rows[0]  || null,
        water_flow:  wfRes.rows[0]  || null,
        lingkungan:  envRes.rows[0] || null,
        patroli: {
          total_hari_ini: parseInt(patTotalRes.rows[0]?.total ?? 0),
          pos_list: patListRes.rows,
        },
      },
    });
  } catch (err) {
    console.error('getSummary error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/water-level
// ════════════════════════════════════════════════════
async function getWaterLevel(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, s1, s2, p1, p2, created_at FROM laporan_water_level ORDER BY created_at DESC LIMIT $1',
      [LIMIT]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getWaterLevel error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/water-level/latest
// ════════════════════════════════════════════════════
async function getLatestWaterLevel(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, s1, s2, p1, p2, created_at FROM laporan_water_level ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('getLatestWaterLevel error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/water-flow
// ════════════════════════════════════════════════════
async function getWaterFlow(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, rate, total, created_at FROM laporan_water_flow ORDER BY created_at DESC LIMIT $1',
      [LIMIT]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getWaterFlow error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/water-flow/latest
// ════════════════════════════════════════════════════
async function getLatestWaterFlow(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, rate, total, created_at FROM laporan_water_flow ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('getLatestWaterFlow error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/lingkungan
// ════════════════════════════════════════════════════
async function getLingkungan(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, t, h, raw, stat, created_at FROM laporan_lingkungan ORDER BY created_at DESC LIMIT $1',
      [LIMIT]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getLingkungan error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/lingkungan/latest
// ════════════════════════════════════════════════════
async function getLatestLingkungan(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, t, h, raw, stat, created_at FROM laporan_lingkungan ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('getLatestLingkungan error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════
//  GET /api/iot/patroli
// ════════════════════════════════════════════════════
async function getPatroli(req, res) {
  try {
    const { rows } = await poolIoT.query(
      'SELECT id, pos, status, created_at FROM laporan_patroli ORDER BY created_at DESC LIMIT $1',
      [LIMIT]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPatroli error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ✅ All functions exported with correct names matching iotRoutes.js
module.exports = {
  getDashboardSummary: getSummary,
  getWaterLevel,
  getLatestWaterLevel,
  getWaterFlow,
  getLatestWaterFlow,
  getLingkungan,
  getLatestLingkungan,
  getPatroli,
};