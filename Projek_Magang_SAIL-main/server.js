const express = require("express");
const cors = require("cors");
const path = require("path");
const mqtt     = require('mqtt');
require('dotenv').config();

const iotRoutes  = require('./routes/iotRoutes');
const authRoutes = require('./routes/auth.route');
const { poolIoT } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use('/api/iot',  iotRoutes);
app.use("/api/webauthn", require("./routes/webauthn.route"));
app.use("/api/auth", require("./routes/auth.route"));

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://192.168.0.211';

const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: 'SAIL_Server_' + Math.random().toString(16).slice(2, 8),
  reconnectPeriod: 5000,
  connectTimeout: 10000,
});

mqttClient.on('connect', () => {
  console.log('✅ MQTT terhubung ke', MQTT_BROKER);

  // Subscribe ke semua topic sensor ESP32
  const topics = [
    'sensor/water_level',   // ESP32 Water Level + Flow (gabungan)
    'sensor/water_flow',    // ESP32 Water Level + Flow (gabungan)
    'sensor/lingkungan',    // ESP32 DHT22 + MiCS gas
    'patroli/laporan',      // ESP32 RFID patroli
  ];
  mqttClient.subscribe(topics, { qos: 1 }, (err) => {
    if (err) console.error('❌ Subscribe gagal:', err.message);
    else     console.log('📥 Subscribe topics:', topics.join(', '));
  });
});

mqttClient.on('error',  err  => console.error('❌ MQTT error:',  err.message));
mqttClient.on('close',  ()   => console.warn ('⚠️  MQTT terputus, reconnecting...'));
mqttClient.on('offline',()   => console.warn ('⚠️  MQTT offline'));

// ═══════════════════════════════════════════════════════════════
//  MQTT → PostgreSQL Bridge
//  Setiap pesan MQTT yang masuk langsung di-INSERT ke tabel DB
// ═══════════════════════════════════════════════════════════════
mqttClient.on('message', async (topic, message) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch {
    console.warn(`⚠️  Bukan JSON dari topic [${topic}]:`, message.toString());
    return;
  }

  try {
    // ── sensor/water_level ──────────────────────────────────────
    // Payload: {"s1":int,"s2":int,"p1":int,"p2":int}
    if (topic === 'sensor/water_level') {
      const { s1, s2, p1, p2 } = data;
      if (s1 == null || s2 == null) { console.warn('WL: field s1/s2 tidak ada'); return; }

      await poolIoT.query(
        'INSERT INTO laporan_water_level (s1, s2, p1, p2) VALUES ($1, $2, $3, $4)',
        [
          Math.max(0, Math.min(100, parseInt(s1))),
          Math.max(0, Math.min(100, parseInt(s2))),
          p1 != null ? parseInt(p1) : 1,
          p2 != null ? parseInt(p2) : 1,
        ]
      );
      console.log(`💧 WL saved: s1=${s1}% s2=${s2}% p1=${p1} p2=${p2}`);
    }

    // ── sensor/water_flow ───────────────────────────────────────
    // Payload: {"rate":float,"total":int}
    else if (topic === 'sensor/water_flow') {
      const { rate, total } = data;
      if (rate == null) { console.warn('WF: field rate tidak ada'); return; }

      await poolIoT.query(
        'INSERT INTO laporan_water_flow (rate, total) VALUES ($1, $2)',
        [
          parseFloat(rate).toFixed(2),
          parseInt(total ?? 0),
        ]
      );
      console.log(`🌊 WF saved: rate=${rate} L/min total=${total} mL`);
    }

    // ── sensor/lingkungan ───────────────────────────────────────
    // Payload: {"h":float,"t":float,"raw":int,"stat":"string"}
    else if (topic === 'sensor/lingkungan') {
      const { h, t, raw, stat } = data;
      if (h == null || t == null) { console.warn('ENV: field h/t tidak ada'); return; }

      // Validasi nilai wajar
      const tVal   = parseFloat(t);
      const hVal   = parseFloat(h);
      const rawVal = parseInt(raw ?? 0);
      if (tVal < -40 || tVal > 85) { console.warn(`ENV: suhu tidak wajar (${tVal}°C)`); return; }
      if (hVal <   0 || hVal > 100){ console.warn(`ENV: kelembapan tidak wajar (${hVal}%)`); return; }

      await poolIoT.query(
        'INSERT INTO laporan_lingkungan (t, h, raw, stat) VALUES ($1, $2, $3, $4)',
        [tVal.toFixed(1), hVal.toFixed(1), rawVal, stat ?? 'NORMAL / AMAN']
      );
      console.log(`🌡️  ENV saved: t=${t}°C h=${h}% raw=${raw} stat="${stat}"`);
    }

    // ── patroli/laporan ─────────────────────────────────────────
    // Payload: {"pos":int,"status":"Aman|Rusak|Aneh|Bahaya"}
    else if (topic === 'patroli/laporan') {
      const { pos, status } = data;
      if (pos == null || !status) { console.warn('PAT: field pos/status tidak ada'); return; }

      const validStatus = ['Aman', 'Rusak', 'Aneh', 'Bahaya'];
      const posVal = parseInt(pos);
      if (posVal < 1 || posVal > 4) { console.warn(`PAT: pos tidak valid (${pos})`); return; }
      if (!validStatus.includes(status)) { console.warn(`PAT: status tidak valid (${status})`); return; }

      await poolIoT.query(
        'INSERT INTO laporan_patroli (pos, status) VALUES ($1, $2)',
        [posVal, status]
      );
      console.log(`🚶 PAT saved: pos=${pos} status="${status}"`);
    }

  } catch (err) {
    console.error(`❌ DB insert error [${topic}]:`, err.message);
  }
});

// ═══════════════════════════════════════════════════════════════
//  Endpoint: Status MQTT (dipakai halaman setting dashboard)
// ═══════════════════════════════════════════════════════════════
app.get('/api/mqtt/status', (req, res) => {
  res.json({ connected: mqttClient.connected });
});

// ═══════════════════════════════════════════════════════════════
//  Endpoint: Kirim setting range water level ke ESP32
//  Body: { "min": 30, "max": 200 }
//  Publish ke: sensor/settings
// ═══════════════════════════════════════════════════════════════
app.post('/api/update-settings', (req, res) => {
  const { min, max } = req.body;

  if (min == null || max == null) {
    return res.status(400).json({ error: 'Field min dan max diperlukan' });
  }
  const minVal = parseInt(min);
  const maxVal = parseInt(max);

  if (isNaN(minVal) || isNaN(maxVal)) {
    return res.status(400).json({ error: 'min dan max harus berupa angka' });
  }
  if (minVal >= maxVal) {
    return res.status(400).json({ error: 'min harus lebih kecil dari max' });
  }

  const payload = JSON.stringify({ min: minVal, max: maxVal });

  mqttClient.publish('sensor/settings', payload, { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error('❌ Publish sensor/settings gagal:', err.message);
      return res.status(500).json({ error: 'Gagal mengirim ke ESP32' });
    }
    console.log('⚙️  Setting terkirim:', payload);
    res.json({ message: 'Pengaturan berhasil dikirim ke ESP32', payload });
  });
});

// ── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server SAIL berjalan di http://localhost:${PORT}`);
});

const ALLOWED_IPS = [
  '127.0.0.1',          // localhost (your own PC via browser)q
  '::1',                // localhost IPv6
  '192.168.0.131',     // your PC (WiFi)
];
