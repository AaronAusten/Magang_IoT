import serial
import json
import threading
import time
import paho.mqtt.client as mqtt
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# ===== KONFIGURASI =====
SERIAL_PORT = "COM9"        # Ganti sesuai port ESP32 (Linux: /dev/ttyUSB0)
SERIAL_BAUD = 115200

MQTT_BROKER = "broker.emqx.io"
MQTT_PORT   = 1883
TOPIC_SENSOR = "rumah/sensor/dht22"
TOPIC_PARAMS = "rumah/params/suhu"

WEB_PORT = 8080

# ===== STATE =====
latest_data = {
    "suhu": "--",
    "kelembaban": "--",
    "threshold_panas": 35.0,
    "threshold_dingin": 20.0,
    "status": "normal",
    "last_update": "-"
}

ser  = None
mqttc = None

# ===========================
# SERIAL: Baca ESP32
# ===========================
def serial_reader():
    global ser, latest_data
    while True:
        try:
            if ser is None or not ser.is_open:
                print(f"[Serial] Menghubungkan ke {SERIAL_PORT}...")
                ser = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=2)
                print("[Serial] Terhubung!")
                time.sleep(2)

            line = ser.readline().decode("utf-8").strip()
            if not line:
                continue

            data = json.loads(line)
            latest_data.update(data)
            latest_data["last_update"] = datetime.now().strftime("%H:%M:%S")

            print(f"[Serial] Diterima: {data}")

            # Forward ke MQTT
            if mqttc and mqttc.is_connected():
                mqttc.publish(TOPIC_SENSOR, json.dumps(data))
                print(f"[MQTT] Published ke {TOPIC_SENSOR}")

        except json.JSONDecodeError:
            pass  # abaikan baris non-JSON (debug print, dsb)
        except serial.SerialException as e:
            print(f"[Serial] Error: {e}, coba lagi 3 detik...")
            ser = None
            time.sleep(3)
        except Exception as e:
            print(f"[Serial] Exception: {e}")
            time.sleep(1)

# ===========================
# SERIAL: Kirim ke ESP32
# ===========================
def kirim_ke_esp32(data: dict):
    global ser
    if ser and ser.is_open:
        try:
            msg = json.dumps(data) + "\n"
            ser.write(msg.encode("utf-8"))
            print(f"[Serial] Kirim ke ESP32: {msg.strip()}")
        except Exception as e:
            print(f"[Serial] Gagal kirim: {e}")
    else:
        print("[Serial] Port tidak terbuka!")

# ===========================
# MQTT
# ===========================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[MQTT] Terhubung ke {MQTT_BROKER}")
        client.subscribe(TOPIC_PARAMS)
        print(f"[MQTT] Subscribe ke {TOPIC_PARAMS}")
    else:
        print(f"[MQTT] Gagal konek, rc={rc}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        print(f"[MQTT] Terima params: {data}")

        # Update state lokal
        if "suhu_panas"  in data: latest_data["threshold_panas"]  = data["suhu_panas"]
        if "suhu_dingin" in data: latest_data["threshold_dingin"] = data["suhu_dingin"]

        # Teruskan ke ESP32 via Serial
        kirim_ke_esp32(data)

    except Exception as e:
        print(f"[MQTT] Error parse: {e}")

def start_mqtt():
    global mqttc
    mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqttc.on_connect = on_connect
    mqttc.on_message = on_message

    while True:
        try:
            mqttc.connect(MQTT_BROKER, MQTT_PORT, keepalive=30)
            mqttc.loop_forever()
        except Exception as e:
            print(f"[MQTT] Disconnected: {e}, reconnect 5 detik...")
            time.sleep(5)

# ===========================
# WEB SERVER (HTTP API)
# ===========================
class WebHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/data":
            self.send_json(200, latest_data)

        elif self.path in ["/", "/index.html"]:
            try:
                with open("dashboard.html", "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"dashboard.html tidak ditemukan!")
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/params":
            length = int(self.headers.get("Content-Length", 0))
            body   = self.rfile.read(length)
            try:
                data   = json.loads(body)
                panas  = float(data.get("suhu_panas",  latest_data["threshold_panas"]))
                dingin = float(data.get("suhu_dingin", latest_data["threshold_dingin"]))

                if dingin >= panas:
                    self.send_json(400, {"error": "Suhu dingin harus lebih kecil dari suhu panas"})
                    return

                params = {"suhu_panas": panas, "suhu_dingin": dingin}
                latest_data["threshold_panas"]  = panas
                latest_data["threshold_dingin"] = dingin

                kirim_ke_esp32(params)

                if mqttc and mqttc.is_connected():
                    mqttc.publish(TOPIC_PARAMS, json.dumps(params))

                self.send_json(200, {"ok": True, **params})
                print(f"[Web] Parameter diubah → Panas: {panas}°C | Dingin: {dingin}°C")

            except Exception as e:
                self.send_json(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def start_web():
    server = HTTPServer(("0.0.0.0", WEB_PORT), WebHandler)
    print(f"[Web] Server jalan di http://localhost:{WEB_PORT}")
    server.serve_forever()

# ===========================
# MAIN
# ===========================
if __name__ == "__main__":
    print("=" * 45)
    print("  ESP32 Bridge: Serial → MQTT + Web")
    print("=" * 45)

    # Jalankan semua thread paralel
    threads = [
        threading.Thread(target=serial_reader, daemon=True),
        threading.Thread(target=start_mqtt,    daemon=True),
        threading.Thread(target=start_web,     daemon=True),
    ]

    for t in threads:
        t.start()

    print(f"\n✅ Semua service berjalan!")
    print(f"   🌐 Buka browser: http://localhost:{WEB_PORT}")
    print(f"   📡 MQTT Broker : {MQTT_BROKER}")
    print(f"   🔌 Serial Port : {SERIAL_PORT}\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Main] Dihentikan.")