import paho.mqtt.client as mqtt
import json
import datetime
import psycopg2

MQTT_BROKER = "192.168.0.211"
MQTT_TOPICS = [
    ("patroli/laporan", 0), 
    ("sensor/water_level", 0), 
    ("sensor/water_flow", 0),
    ("sensor/lingkungan", 0)
]

DB_CONF = {
    "host": "localhost",
    "database": "SAIL_IoT",
    "user": "postgres",
    "password": "Anoraa"
}

def save_to_db(query, params):
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONF)
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return False
    finally:
        if conn: conn.close()

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"🚀 Gateway SAIL Aktif! Mendengarkan {len(MQTT_TOPICS)} sistem...")
        client.subscribe(MQTT_TOPICS)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        waktu = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. SISTEM PATROLI RFID
        if msg.topic == "patroli/laporan":
            print(f"👮 [PATROLI] Pos: {data['pos']} | Status: {data['status']}")
            save_to_db("INSERT INTO laporan_patroli (pos, status, waktu) VALUES (%s, %s, %s)", 
                       (data['pos'], data['status'], waktu))

        # 2. SISTEM WATER LEVEL (Pompa)
        elif msg.topic == "sensor/water_level":
            p1 = "ON" if data['p1'] == 0 else "OFF"
            p2 = "ON" if data['p2'] == 0 else "OFF"
            print(f"🌊 [LEVEL] S1: {data['s1']}% | S2: {data['s2']}% | P1: {p1} | P2: {p2}")
            save_to_db("INSERT INTO laporan_water_level (persen_s1, persen_s2, status_pompa1, status_pompa2, waktu) VALUES (%s, %s, %s, %s, %s)", 
                       (data['s1'], data['s2'], p1, p2, waktu))

        # 3. SISTEM WATER FLOW
        elif msg.topic == "sensor/water_flow":
            print(f"💧 [FLOW] Rate: {data['rate']} L/min | Total: {data['total']} mL")
            save_to_db("INSERT INTO laporan_water_flow (flow_rate, total_ml, waktu) VALUES (%s, %s, %s)", 
                       (data['rate'], data['total'], waktu))

        # 4. SISTEM LINGKUNGAN (DHT & Gas)
        elif msg.topic == "sensor/lingkungan":
            print(f"🌡️ [ENV] Suhu: {data['t']}C | Lembap: {data['h']}% | Gas: {data['stat']}")
            save_to_db("INSERT INTO laporan_lingkungan (suhu, kelembapan, gas_raw, status_udara, waktu) VALUES (%s, %s, %s, %s, %s)", 
                       (data['t'], data['h'], data['raw'], data['stat'], waktu))

    except Exception as e:
        print(f"⚠️ Gagal memproses data dari {msg.topic}: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()