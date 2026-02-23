import paho.mqtt.client as mqtt
import psycopg2
import psycopg2.pool
import json

# ══════════════════════════════════════════════════════════════
#  KONFIGURASI
# ══════════════════════════════════════════════════════════════
MQTT_BROKER = "192.168.0.211"
MQTT_PORT   = 1883

MQTT_TOPICS = [
    ("patroli/laporan",    0),
    ("sensor/water_level", 0),
    ("sensor/water_flow",  0),
    ("sensor/lingkungan",  0),
]

DB_CONF = {
    "host":     "localhost",
    "database": "SAIL_IoT",
    "user":     "postgres",
    "password": "Anoraa",
    "port":     5432,
}

# Connection pool — buka 1–5 koneksi, tidak buka-tutup tiap pesan
_pool = psycopg2.pool.SimpleConnectionPool(1, 5, **DB_CONF)

# ══════════════════════════════════════════════════════════════
#  HELPER DB
# ══════════════════════════════════════════════════════════════
def save(query: str, params: tuple) -> bool:
    conn = _pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        conn.rollback()
        print(f"❌ DB Error: {e}")
        return False
    finally:
        _pool.putconn(conn)

# ══════════════════════════════════════════════════════════════
#  MQTT CALLBACKS
# ══════════════════════════════════════════════════════════════
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"🚀 Gateway SAIL Aktif! Mendengarkan {len(MQTT_TOPICS)} topik...")
        client.subscribe(MQTT_TOPICS)
    else:
        print(f"❌ Gagal konek MQTT, reason_code={reason_code}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
    except json.JSONDecodeError as e:
        print(f"⚠️  Bukan JSON dari [{msg.topic}]: {e}")
        return

    topic = msg.topic

    # ──────────────────────────────────────────────────────────
    #  1. PATROLI RFID
    #  Payload  : {"pos":int, "status":"Aman|Rusak|Aneh|Bahaya"}
    #  Tabel    : laporan_patroli(pos, status)
    #  created_at diisi otomatis oleh DEFAULT NOW()
    # ──────────────────────────────────────────────────────────
    if topic == "patroli/laporan":
        pos    = int(data.get("pos", 0))
        status = str(data.get("status", ""))

        if pos not in range(1, 5):
            print(f"⚠️  [PATROLI] pos tidak valid: {pos}"); return
        if status not in ("Aman", "Rusak", "Aneh", "Bahaya"):
            print(f"⚠️  [PATROLI] status tidak valid: {status}"); return

        ok = save(
            "INSERT INTO laporan_patroli (pos, status) VALUES (%s, %s)",
            (pos, status)
        )
        if ok:
            print(f"👮 [PATROLI] Pos {pos} → {status}")

    # ──────────────────────────────────────────────────────────
    #  2. WATER LEVEL + POMPA
    #  Payload  : {"s1":int, "s2":int, "p1":int, "p2":int}
    #             s1,s2 = persen tangki (0–100)
    #             p1,p2 = 0=NYALA (relay LOW), 1=MATI (relay HIGH)
    #  Tabel    : laporan_water_level(s1, s2, p1, p2)
    # ──────────────────────────────────────────────────────────
    elif topic == "sensor/water_level":
        s1 = max(0, min(100, int(data.get("s1", 0))))
        s2 = max(0, min(100, int(data.get("s2", 0))))
        p1 = int(data.get("p1", 1))  # default MATI jika tidak ada
        p2 = int(data.get("p2", 1))

        ok = save(
            "INSERT INTO laporan_water_level (s1, s2, p1, p2) VALUES (%s, %s, %s, %s)",
            (s1, s2, p1, p2)
        )
        status_p1 = "NYALA" if p1 == 0 else "MATI"
        status_p2 = "NYALA" if p2 == 0 else "MATI"
        if ok:
            print(f"🌊 [LEVEL] S1:{s1}%  S2:{s2}%  P1:{status_p1}  P2:{status_p2}")

    # ──────────────────────────────────────────────────────────
    #  3. WATER FLOW
    #  Payload  : {"rate":float, "total":int}
    #             rate  = L/menit
    #             total = mL akumulasi sejak boot
    #  Tabel    : laporan_water_flow(rate, total)
    # ──────────────────────────────────────────────────────────
    elif topic == "sensor/water_flow":
        rate  = round(float(data.get("rate",  0)), 2)
        total = int(data.get("total", 0))

        ok = save(
            "INSERT INTO laporan_water_flow (rate, total) VALUES (%s, %s)",
            (rate, total)
        )
        if ok:
            print(f"💧 [FLOW] Rate:{rate} L/min  Total:{total} mL")

    # ──────────────────────────────────────────────────────────
    #  4. LINGKUNGAN (DHT22 + Gas MiCS)
    #  Payload  : {"t":float, "h":float, "raw":int, "stat":"string"}
    #             t    = suhu °C
    #             h    = kelembapan %RH
    #             raw  = ADC gas 0–4095
    #             stat = "SANGAT BERSIH"|"NORMAL / AMAN"|
    #                    "TERDETEKSI GAS"|"BAHAYA"
    #  Tabel    : laporan_lingkungan(t, h, raw, stat)
    # ──────────────────────────────────────────────────────────
    elif topic == "sensor/lingkungan":
        t    = round(float(data.get("t",   0)), 1)
        h    = round(float(data.get("h",   0)), 1)
        raw  = max(0, min(4095, int(data.get("raw", 0))))
        stat = str(data.get("stat", "NORMAL / AMAN"))

        # Validasi dasar agar tidak simpan data rusak
        if not (-40 <= t <= 85):
            print(f"⚠️  [ENV] Suhu tidak wajar: {t}°C"); return
        if not (0 <= h <= 100):
            print(f"⚠️  [ENV] Kelembapan tidak wajar: {h}%"); return

        ok = save(
            "INSERT INTO laporan_lingkungan (t, h, raw, stat) VALUES (%s, %s, %s, %s)",
            (t, h, raw, stat)
        )
        if ok:
            print(f"🌡️  [ENV] Suhu:{t}°C  Lembap:{h}%  Gas:{raw} ({stat})")

    else:
        print(f"ℹ️  Topic tidak dikenal: {topic}")

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def on_disconnect(client, userdata, flags, reason_code, properties):
    if reason_code != 0:
        print(f"⚠️  MQTT terputus (reason={reason_code}), akan reconnect otomatis...")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect    = on_connect
client.on_message    = on_message
client.on_disconnect = on_disconnect

print(f"🔌 Menghubungkan ke MQTT broker {MQTT_BROKER}:{MQTT_PORT}...")
client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
client.loop_forever()