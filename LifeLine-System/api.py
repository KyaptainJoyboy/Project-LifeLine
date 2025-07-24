from flask import Flask, request, jsonify
import numpy as np
from health_ai import HealthAIPredictor  # Import the HealthAIPredictor class

app = Flask(__name__)

# Initialize the HealthAIPredictor
predictor = HealthAIPredictor()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get the health data from the request
        data = request.json
        # Prepare the metrics for prediction
        metrics = {
            'heartRate': data['heart_rate'],
            'bloodPressure': f"{data['blood_pressure_systolic']}/{data['blood_pressure_diastolic']}",
            'spo2': data['spo2'],
            'temperature': data['temperature'],
            'glucose': data.get('glucose', 100)  # Default if missing
        }

        # Make predictions using the HealthAIPredictor
        result = predictor.predict_health(metrics)

        # Return the prediction result
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)