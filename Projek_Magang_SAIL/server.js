const express = require("express");
const cors = require("cors");
const path = require("path");
const mqtt = require('mqtt');
const iotRoutes = require('./routes/iotRoutes');

const app = express();

// 1. Middleware (Wajib di atas)
app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, "public")));
app.use('/api/iot', iotRoutes)

// 2. Koneksi MQTT
const mqttClient = mqtt.connect('mqtt://192.168.0.211'); 

mqttClient.on('connect', () => {
    console.log('✅ Terhubung ke MQTT Broker');
});

// 3. API Endpoint untuk Update Settings
app.post('/api/update-settings', (req, res) => {
    const { min, max } = req.body;

    if (min === undefined || max === undefined) {
        return res.status(400).json({ error: 'Data min dan max diperlukan' });
    }

    const payload = JSON.stringify({ min: parseInt(min), max: parseInt(max) });

    mqttClient.publish('sensor/settings', payload, { qos: 1 }, (err) => {
        if (err) {
            console.error('MQTT Publish Error:', err);
            return res.status(500).json({ error: 'Gagal mengirim ke ESP32' });
        }
        console.log('📡 Data Terkirim:', payload);
        res.json({ message: 'Pengaturan terkirim ke alat!' });
    });
});

// Jalankan Server
app.listen(3000, () => {
  console.log("🔥 Server berjalan di http://localhost:3000");
});