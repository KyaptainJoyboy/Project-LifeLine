import os
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
# from flask_socketio import SocketIO, emit  # REMOVE flask_socketio
import asyncio
import websockets
import json

from health_ai import HealthAIPredictor  # Import the predictor class

# --- Flask Application Setup ---
app = Flask(__name__, static_folder=None)  # Disable default static folder handling initially
CORS(app)  # Enable Cross-Origin Resource Sharing for all routes

app.config['SECRET_KEY'] = 'secret!'

# --- Predictor Initialization ---
predictor = None
try:
    print("Initializing HealthAIPredictor...")
    predictor = HealthAIPredictor()
    print("HealthAIPredictor initialized successfully.")
except SystemExit as e:
    print(f"FATAL: Failed to initialize predictor: {e}")
    # The application might still run but the /predict endpoint will fail.
except Exception as e:
    print(f"FATAL: An unexpected error occurred during predictor initialization: {e}")
    print(traceback.format_exc())


# --- Static File Serving ---
# Route for serving index.html at the root
@app.route('/')
def serve_index():
    print("Serving index.html")
    return send_from_directory('.', 'index.html')


# Route for serving other static files (CSS, JS, images, vendor libraries, other HTML)
# This captures requests for files in css/, js/, img/, vendor/, scss/, partials/ and specific html files
@app.route('/<path:path>')
def serve_static_files(path):
    print(f"Attempting to serve static file: {path}")
    # Basic security check: prevent accessing files outside the project
    if '..' in path or path.startswith('/'):
        return "Not Found", 404

    # Determine the correct directory based on the path prefix
    if path.startswith('css/') or path.startswith('js/') or \
            path.startswith('img/') or path.startswith('vendor/') or \
            path.startswith('scss/') or path.startswith('partials/'):
        # Serve from the respective directory
        return send_from_directory('.', path)
    elif path.endswith('.html'):
        # Serve other HTML files from the root directory
        return send_from_directory('.', path)
    else:
        # If it doesn't match known static directories or HTML files, return 404
        print(f"File not found or not allowed: {path}")
        return "Not Found", 404

# --- WebSocket Handler ---
connected_clients = set()

async def handle_websocket(websocket, path):
    print(f"New WebSocket connection from {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            print(f"Received message from Arduino: {message}")
            try:
                data = json.loads(message)
                print(f"Parsed JSON data: {data}")
                # Relay data to all connected clients
                for client in connected_clients:
                    if client != websocket and client.open:
                        try:
                            await client.send(json.dumps(data))
                        except Exception as e:
                            print("Error sending data to client: {e}")
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {message}")
            except Exception as e:
                print(f"Error handling message: {e}")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"WebSocket connection closed: {e}")
    except Exception as e:
        print(f"Error in WebSocket handler: {e}")
    finally:
        connected_clients.remove(websocket)

# --- API Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    global predictor  # Access the globally initialized predictor
    print("Received request for /predict")

    if predictor is None:
        print("Error: Predictor not initialized.")
        return jsonify({"error": "Prediction service is unavailable due to model loading issues."}), 500

    if not request.is_json:
        print("Error: Request is not JSON.")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    print(f"Received data for prediction: {data}")

    # Basic validation of incoming data (adjust keys as needed based on your JS)
    required_keys = ['heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'spo2', 'temperature', 'glucose']  # Match keys sent by JS
    if not all(key in data for key in required_keys):
        missing_keys = [key for key in required_keys if key not in data]
        print(f"Error: Missing required keys: {missing_keys}")
        return jsonify({"error": f"Missing required keys: {missing_keys}. Expected: {required_keys}"}), 500

    try:
        # Get predictions from the predictor class instance
        predictions_result = predictor.predict_health(data)
        print(f"Prediction result: {predictions_result}")

        # Return the results in the format expected by the frontend
        return jsonify({"predictions": predictions_result})

    except Exception as e:
        print(f"Error during /predict handling: {e}")
        print(traceback.format_exc())
        return jsonify({"error": "An internal error occurred during prediction."}), 500


# --- Server Execution ---
async def main():
    # Start the WebSocket server
    ws_server = websockets.serve(handle_websocket, '0.0.0.0', 5001)
    # Run the Flask app
    # Use host='0.0.0.0' to make it accessible on the network
    # Debug=True is useful for development but should be False in production
    print("Starting Flask server...")
    # Use port 5001 to avoid potential conflicts if 5000 is common
    await ws_server
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)

if __name__ == '__main__':
    asyncio.run(main())
