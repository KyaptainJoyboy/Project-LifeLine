# Lifeline Embedded Systems

**Lifeline Embedded Systems** integrates a MAX30105-based sensor suite (heart rate, SpO₂, temperature, blood pressure, glucose placeholder) with an Nano ESP 32 board and a TFT display, streaming real‑time vitals both on‑screen and via WebSockets to a Flask server.

## 📥 Download & Installation

1. **Clone the repository** or download the ZIP and extract:

   ```bash
   git clone https://github.com/yourusername/lifeline-embedded.git
   cd lifeline-embedded
   ```
2. **Arduino Libraries** (via Library Manager or manual install):

   * `MAX30105` & `spo2_algorithm`
   * `TFT_eSPI` SPECIAL LIBRARY
   * `WebSocketsClient`
   * `WiFi` (built‑in for ESP32)
3. **Python Server**:

   ```bash
   pip install flask flask-cors flask-socketio eventlet
   ```

## ⚙️ Wiring & Hardware

| Component    | ESP32 Pin | Notes                            |
| ------------ | --------- | -------------------------------- |
| MAX30105 SCL | A5        | I²C clock                        |
| MAX30105 SDA | A4        | I²C data                         |
| MAX30105 VIN | 3.3 V     | Power                            |
| MAX30105 GND | GND       | Ground                           |
| TFT\_MISO    | GPIO 47   | SPI MISO (display SPI MISO)      |
| TFT\_MOSI    | GPIO 38   | SPI MOSI (sometimes labeled SDA) |
| TFT\_SCLK    | GPIO 48   | SPI Clock                        |
| TFT\_CS      | GPIO 18   | Chip Select                      |
| TFT\_DC      | GPIO 17   | Data/Command                     |
| TFT\_RST     | GPIO 10   | Reset                            |

## 🚀 Uploading to ESP32

1. Open **Arduino IDE** or **PlatformIO**.
2. Load `lifeline.ino` (or main `.cpp`).
3. Update **WiFi credentials** and **server IP** in the top of the sketch.
4. Select **ESP32** board and correct COM port.
5. Click **Upload**.

## 🖥️ Flask Server Setup

1. Place `app.py` and `index.html`, `functions.js` in the same folder.
2. Run:

   ```bash
   python app.py
   ```
3. Visit `http://<server_ip>:5001/` in your browser.
4. Sensor data will appear in real time on the webpage.

## 📱 Frontend & WebSocket Protocol

* **WebSockets** namespace: `/socket.io` or `/` depending on configuration.
* Event `real_device_data`: receives JSON payload:

  ```json
  {
    "heart_rate": 72,
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "spo2": 98,
    "temperature": 36.7,
    "glucose": 100
  }
  ```
* The JS file (`functions.js`) listens for `update_health_metrics` and updates DOM.

## 👩‍💻 For Programmers

* **Modular code**: sensor sampling, display rendering, WebSocket comms separated into functions.
* **Rolling buffer**: 100 samples @100 Hz ≈1 s window; triggers PoX algorithm.
* **Prompt state machine**: reduces flicker by redrawing only on state change.
* **Customization**: adjust `BUFFER_SIZE`, `FINGER_THRESHOLD`, text sizes, card layout in `drawTemplate()`.

## 🤝 For Non‑Programmers

1. **Wire up** the sensor and display to your ESP32 following the table above.
2. **Install libraries** in Arduino IDE via **Sketch → Include Library → Manage Libraries**.
3. **Open** the sketch, enter your Wi‑Fi name and password at the top.
4. **Upload** to board. Place your finger on the sensor—watch the display!
5. **Open browser** to the Flask server address to see data mirrored online.

---

*Enjoy your real‑time vital monitoring system!*
