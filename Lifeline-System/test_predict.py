import joblib
from health_ai import HealthAIPredictor  # Import the class
import pandas as pd

# Load the models (ensure the paths are correct)
try:
    health_predictor = HealthAIPredictor()
except Exception as e:
    print(f"Error loading models: {e}")
    exit()

# Define test metrics (example values)
test_metrics = {
    'heart_rate': 75,
    'blood_pressure_systolic': 120,
    'blood_pressure_diastolic': 80,
    'spo2': 98,
    'temperature': 36.6,
    'glucose': 100
}

# Make predictions
try:
    predictions = health_predictor.predict_health(test_metrics)
    print("Predictions:")
    for prediction in predictions:
        print(prediction)
except Exception as e:
    print(f"Error during prediction: {e}")
