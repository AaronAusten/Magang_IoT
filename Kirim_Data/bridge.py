import paho.mqtt.client as mqtt
import psycopg2
from datetime import datetime

# --- KONFIGURASI ---
MQTT_BROKER = "10.159.97.125" 
TOPIC = "pabrik/sensor/suhu"

# Ganti sesuai dengan kredensial PostgreSQL kamu
DB_CONF = {
    "host": "localhost",
    "database": "SAIL_IoT", 
    "user": "postgres",
    "password": "Anoraa" # Isi password postgres kamu
}

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Python terhubung ke Broker!")
        client.subscribe(TOPIC)
    else:
        print(f"❌ Gagal konek, kode error: {rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Data masuk: {payload}")
    try:
        # Script memecah data "suhu,kelembapan" dari ESP32
        suhu, lembap = payload.split(",")
        conn = psycopg2.connect(**DB_CONF)
        cur = conn.cursor()
        cur.execute("INSERT INTO log_sensor_suhu (suhu, kelembapan) VALUES (%s, %s)", (float(suhu), float(lembap)))
        conn.commit()
        cur.close()
        conn.close()
        print("🚀 Data tersimpan ke PostgreSQL")
    except Exception as e:
        print(f"⚠️ Gagal simpan ke DB: {e}")

# Inisialisasi MQTT dengan API Version 2
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message

try:
    print("Menghubungkan ke Broker...")
    client.connect(MQTT_BROKER, 1883)
    client.loop_forever()
except Exception as e:
    print(f"❌ Error: {e}")