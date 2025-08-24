import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import joblib
import os

# Create the models directory if it doesn't exist
if not os.path.exists('models'):
    os.makedirs('models')

# 1. Load the data
try:
    data = pd.read_csv('health_data.csv')
except FileNotFoundError:
    print("Error: health_data.csv not found. Please create this file with appropriate data.")
    exit()

# 2. Preprocess the data
# Handle missing values (replace with mean)
data = data.fillna(data.mean())

# Separate features and target variable
X = data[['heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature', 'glucose']]
y = data['health_issue']

# Scale features
scaler = StandardScaler()
X = scaler.fit_transform(X)

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train the Random Forest Classifier
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# 4. Train the Neural Network
nn_model = MLPClassifier(hidden_layer_sizes=(64, 32), activation='relu', solver='adam', random_state=42, max_iter=500)
nn_model.fit(X_train, y_train)

# 5. Evaluate the models
rf_predictions = rf_model.predict(X_test)
nn_predictions = nn_model.predict(X_test)

rf_accuracy = accuracy_score(y_test, rf_predictions)
nn_accuracy = accuracy_score(y_test, nn_predictions)

print(f"Random Forest Accuracy: {rf_accuracy}")
print(f"Neural Network Accuracy: {nn_accuracy}")

# Add feature names to the model
X = pd.DataFrame(X, columns=['heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature', 'glucose'])
rf_model.feature_names_in_ = X.columns

# 6. Save the trained models
joblib.dump(rf_model, 'models/random_forest.pkl')

from tensorflow import keras
nn_model = keras.models.Sequential([
    keras.layers.Dense(128, activation='relu', input_shape=(X_train.shape[1],)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(1, activation='sigmoid')  # Assuming binary classification
])

nn_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

nn_model.fit(X_train, y_train, epochs=10, batch_size=32, validation_split=0.1)

nn_model.save('models/neural_network.h5')


print("Models trained and saved successfully!")
