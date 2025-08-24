# LifeLine-System

LifeLine-System is a real-time health monitoring web application that receives biosensor data (via WebSocket) and provides AI-powered health predictions.

## Features

- Real-time vital sign dashboard
- AI-based health risk predictions
- WebSocket integration for live data from embedded devices
- Responsive Bootstrap-based frontend

## Quick Start

### 1. Install Python Dependencies

Create a virtual environment (optional but recommended):

```sh
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```sh
pip install -r requirements.txt
```

### 2. Train AI Models (First Time Only)

If you haven't already, train the AI models:

```sh
python train_models.py
```

This will generate `models/random_forest.pkl` and `models/neural_network.h5` using `health_data.csv`.

### 3. Run the Server

Start the Flask + WebSocket server:

```sh
python app.py
```

- The web dashboard will be available at [http://localhost:5000/](http://localhost:5000/)
- WebSocket server listens on port 5001 for device connections.

### 4. Using the Dashboard

- Open your browser to [http://localhost:5000/](http://localhost:5000/)
- Connect your embedded device (see Lifeline-Embedd docs) to send real-time data.

## File Structure

- `app.py` — Main Flask app and WebSocket server
- `health_ai.py` — AI prediction logic and model loading
- `train_models.py` — Script to train and save ML models
- `health_data.csv` — Example/training data
- `models/` — Saved ML models
- `js/`, `css/`, `img/` — Frontend assets

## Requirements

See [requirements.txt](requirements.txt) for Python dependencies.

---

## Troubleshooting

- If you see "Essential model files missing", run `python train_models.py` first.
- Make sure your device is sending data to the correct WebSocket port (default: 5001).
