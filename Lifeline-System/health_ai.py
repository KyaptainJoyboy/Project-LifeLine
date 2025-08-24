import numpy as np
from sklearn.ensemble import RandomForestClassifier
import numpy as np
from sklearn.ensemble import RandomForestClassifier
# Removed Flask imports, will be in app.py
from tensorflow import keras
import joblib
import pandas as pd
import traceback # Import traceback for detailed error logging

# --- Health AI Predictor Class ---
class HealthAIPredictor:
    def __init__(self):
        self.rf_model = None
        self.nn_model = None
        self.feature_names = ['heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature', 'glucose'] # Define expected features
        self.load_models()

    def load_models(self):
        try:
            # Load pre-trained models if they exist
            print("Loading models...")
            self.rf_model = joblib.load('models/random_forest.pkl')
            try:
                self.nn_model = keras.models.load_model('models/neural_network.h5')
                print("Neural Network Model loaded successfully.")

            except ValueError as e:
                print(f"Error loading Neural Network model: {e}")
                print("Using Random Forest model as fallback.")
                self.nn_model = None # Ensure nn_model is None if loading fails

            print("Random Forest Model loaded successfully.")
            # Check if the loaded RF model has feature names (important for consistency)
            if hasattr(self.rf_model, 'feature_names_in_'):
                self.feature_names = self.rf_model.feature_names_in_
                print(f"Using feature names from loaded RF model: {self.feature_names}")
            else:
                 print(f"Warning: Loaded RF model missing feature names. Using default: {self.feature_names}")

        except FileNotFoundError:
            print("Model files not found. Please ensure 'models/random_forest.pkl' and 'models/neural_network.h5' exist.")
            print("You may need to run 'train_models.py' first.")
            # You might want to raise an error or exit if models are essential
            raise SystemExit("Essential model files missing.")
        except Exception as e:
            print(f"An unexpected error occurred loading models: {e}")
            print(traceback.format_exc())
            raise SystemExit("Failed to load models due to an unexpected error.")

    def preprocess_data(self, metrics):
        """
        Prepares the input metrics dictionary into a Pandas DataFrame suitable for the models.
        Ensures the columns match the order expected by the trained models.
        """
        try:
            # Use the keys sent by the frontend
            data = {
                'heart_rate': metrics.get('heart_rate'),
                'systolic_bp': metrics.get('blood_pressure_systolic'),
                'diastolic_bp': metrics.get('blood_pressure_diastolic'),
                'spo2': metrics.get('spo2'),
                'temperature': metrics.get('temperature'),
                'glucose': metrics.get('glucose', 100) # Provide a default if not sent
            }
            # Create DataFrame with the specific column order
            features = pd.DataFrame([data], columns=self.feature_names)

            # Basic validation/conversion (could be more robust)
            features = features.astype(float) # Ensure numeric types
            # Replace NaN values with 0
            features = features.fillna(0)
            # Ensure values are within a reasonable range
            features['heart_rate'] = features['heart_rate'].clip(0, 200)
            features['systolic_bp'] = features['systolic_bp'].clip(0, 300)
            features['diastolic_bp'] = features['diastolic_bp'].clip(0, 200)
            features['spo2'] = features['spo2'].clip(0, 100)
            features['temperature'] = features['temperature'].clip(30, 45)
            features['glucose'] = features['glucose'].clip(0, 500)

            if features.isnull().values.any():
                 print(f"Warning: Missing values detected in input: {data}")
                 # Handle missing values if necessary (e.g., imputation)
                 # For now, we'll let the model handle it or potentially error
            return features

        except Exception as e:
            print(f"Error during preprocessing: {e}")
            print(f"Input metrics: {metrics}")
            print(traceback.format_exc())
            return None

    def predict_health(self, metrics):
        """
        Makes health predictions based on the input metrics using loaded models.
        Returns a list of prediction dictionaries as expected by the frontend.
        """
        predictions_list = []
        try:
            features = self.preprocess_data(metrics)
            if features is None:
                 return [{'condition': 'Processing Error', 'probability': 0, 'severity': 'unknown'}]

            # Ensure models are loaded
            if self.rf_model is None:
                print("Error: Random Forest Model is not loaded.")
                return [{'condition': 'Model Loading Error', 'probability': 0, 'severity': 'unknown'}]

            # --- Get predictions (example logic, adapt to your models) ---
            # This part needs to be adapted based on what your models actually predict.
            # Assuming models predict probability of *some* adverse condition.
            # You'll need to map these probabilities to specific conditions.

            if self.nn_model is not None:
                rf_prob = self.rf_model.predict_proba(features)[0][1] # Probability of class 1 (adverse)
                nn_prob = self.nn_model.predict(features)[0][0]      # Probability from NN

                # Simple Averaging Ensemble
                combined_prob = (rf_prob + nn_prob) / 2
            else:
                rf_prob = self.rf_model.predict_proba(features)[0][1]
            combined_prob = rf_prob

            # --- Map probability/metrics to conditions and severity ---
            # This is a crucial step requiring domain knowledge or defined rules.
            # Example Rules:
            hr = metrics.get('heart_rate', 80)
            sys_bp = metrics.get('blood_pressure_systolic', 120)
            dias_bp = metrics.get('blood_pressure_diastolic', 80)
            spo2 = metrics.get('spo2', 98)
            temp = metrics.get('temperature', 36.6)
            glucose = metrics.get('glucose', 100)

            predictions_list = []

            # Blood Pressure
            if sys_bp >= 180 or dias_bp >= 120:
                predictions_list.append({'condition': 'Hypertensive Crisis', 'probability': 0.95, 'severity': 'critical', 'icon': 'fas fa-heart-attack'})
            elif sys_bp >= 140 or dias_bp >= 90:
                predictions_list.append({'condition': 'Hypertension', 'probability': combined_prob * 0.8, 'severity': 'high', 'icon': 'fas fa-heart'})
            elif sys_bp < 90 or dias_bp < 60:
                predictions_list.append({'condition': 'Hypotension', 'probability': combined_prob * 0.7, 'severity': 'medium', 'icon': 'fas fa-tint'})
            elif sys_bp > 120 and sys_bp < 140 or dias_bp > 80 and dias_bp < 90:
                predictions_list.append({'condition': 'Elevated Blood Pressure', 'probability': combined_prob * 0.6, 'severity': 'medium', 'icon': 'fas fa-arrow-up'})

            # Oxygen Saturation
            if spo2 < 88:
                predictions_list.append({'condition': 'Severe Hypoxia', 'probability': 0.9, 'severity': 'critical', 'icon': 'fas fa-lungs'})
            elif spo2 < 92:
                predictions_list.append({'condition': 'Hypoxia', 'probability': combined_prob * 0.7, 'severity': 'high', 'icon': 'fas fa-lungs'})
            elif spo2 < 95:
                predictions_list.append({'condition': 'Low Oxygen Saturation', 'probability': combined_prob * 0.5, 'severity': 'medium', 'icon': 'fas fa-thermometer-quarter'})

            # Temperature
            if temp >= 41:
                predictions_list.append({'condition': 'Hyperthermia', 'probability': combined_prob * 0.7, 'severity': 'critical', 'icon': 'fas fa-thermometer-full'})
            elif temp >= 39.5:
                predictions_list.append({'condition': 'Hyperthermia', 'probability': combined_prob * 0.7, 'severity': 'high', 'icon': 'fas fa-thermometer-half'})
            elif temp >= 38:
                predictions_list.append({'condition': 'Fever', 'probability': combined_prob * 0.5, 'severity': 'medium', 'icon': 'fas fa-thermometer-quarter'})
            elif temp < 35:
                predictions_list.append({'condition': 'Hypothermia', 'probability': combined_prob * 0.6, 'severity': 'medium', 'icon': 'fas fa-snowflake'})

            # Glucose
            if glucose >= 300:
                predictions_list.append({'condition': 'Severe Hyperglycemia', 'probability': 0.9, 'severity': 'critical', 'icon': 'fas fa-burn'})
            elif glucose >= 200:
                predictions_list.append({'condition': 'Hyperglycemia', 'probability': combined_prob * 0.7, 'severity': 'high', 'icon': 'fas fa-burn'})
            elif glucose < 70:
                predictions_list.append({'condition': 'Hypoglycemia', 'probability': combined_prob * 0.7, 'severity': 'medium', 'icon': 'fas fa-burn'})

            # Heart Rate
            if hr >= 150:
                predictions_list.append({'condition': 'Severe Tachycardia', 'probability': 0.85, 'severity': 'critical', 'icon': 'fas fa-heartbeat'})
            elif hr >= 100:
                predictions_list.append({'condition': 'Tachycardia', 'probability': combined_prob * 0.6, 'severity': 'medium', 'icon': 'fas fa-heartbeat'})
            elif hr <= 40:
                predictions_list.append({'condition': 'Severe Bradycardia', 'probability': 0.85, 'severity': 'critical', 'icon': 'fas fa-heartbeat'})
            elif hr <= 60:
                predictions_list.append({'condition': 'Bradycardia', 'probability': combined_prob * 0.6, 'severity': 'medium', 'icon': 'fas fa-heartbeat'})

            # Combine conditions if multiple are true
            if not predictions_list:
                predictions_list.append({'condition': 'Normal', 'probability': 1.0 - combined_prob, 'severity': 'low', 'icon': 'fas fa-check-circle'})

            print(f"Generated predictions: {predictions_list}")
            return predictions_list

            print(f"Generated predictions: {predictions_list}")
            return predictions_list

        except Exception as e:
            print(f"Prediction error: {e}")
            print(f"Input metrics: {metrics}")
            print(traceback.format_exc())
            return [{'condition': 'Unable to provide a prediction with current data. Please check input values.', 'probability': 0, 'severity': 'unknown'}]

# Note: Flask app setup and routes have been moved to app.py
