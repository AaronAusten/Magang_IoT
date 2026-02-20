const express = require('express');
const router = express.Router();
const {
  getWaterLevel,
  getLatestWaterLevel,
  getWaterFlow,
  getLatestWaterFlow,
  getLingkungan,
  getLatestLingkungan,
  getPatroli,
  getDashboardSummary,
} = require('../controllers/iotController');

// Dashboard summary (semua sensor terbaru)
router.get('/dashboard/summary', getDashboardSummary);

// Water Level
router.get('/water-level', getWaterLevel);
router.get('/water-level/latest', getLatestWaterLevel);

// Water Flow
router.get('/water-flow', getWaterFlow);
router.get('/water-flow/latest', getLatestWaterFlow);

// Lingkungan (suhu, kelembapan, gas)
router.get('/lingkungan', getLingkungan);
router.get('/lingkungan/latest', getLatestLingkungan);

// Patroli
router.get('/patroli', getPatroli);

module.exports = router;