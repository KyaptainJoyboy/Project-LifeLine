// Working Simulation Implementation
document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing simulation...');

    // Get all required elements
    const startBtn = document.getElementById('start-simulation');
    const typeSelect = document.getElementById('simulation-type');
    const frequencyInput = document.getElementById('data-frequency');
    const statusElement = document.getElementById('simulation-status');
    const dataModeSelect = document.getElementById('data-mode');
    const connectionStatusElement = document.getElementById('connection-status');

    if (!startBtn || !typeSelect || !frequencyInput || !dataModeSelect) {
        console.error('Missing required elements');
        return;
    }

    let simulationInterval = null;
    let isRunning = false;
    let latestMetrics = { // Initialize latestMetrics with default values
        heartRate: 0,
        bloodPressureSystolic: 0,
        bloodPressureDiastolic: 0,
        spo2: 0,
        glucose: null, // Glucose is not sent by the device
        temperature: 0.0
    };
    let socket = null;
    let dataMode = 'simulated'; // Track current data mode ('simulated' or 'real_device')

    // New elements for predictive health insight system
    const startPredictionBtn = document.getElementById('start-prediction');
    const consentPopup = document.getElementById('consent-popup');
    const consentAcceptBtn = document.getElementById('consent-accept');
    const consentDeclineBtn = document.getElementById('consent-decline');
    const predictionResultsContainer = document.getElementById('prediction-results');
    const emergencyPopup = document.getElementById('emergency-popup');
    const emergencyCloseBtn = document.getElementById('emergency-close');

    // Start/Stop simulation
    startBtn.addEventListener('click', () => { // Converted to arrow function
        if (isRunning) {
            stopSimulation();
        } else {
            const type = typeSelect.value;
            const frequency = Math.max(1000, parseInt(frequencyInput.value) || 5000);
            const dataMode = dataModeSelect.value;
            startSimulation(type, frequency, dataMode);
        }
    }); // End of startBtn event listener (Converted to arrow function, removed semicolon)

    // --- Predictive Health Insight System Logic ---

    if (startPredictionBtn && consentPopup && consentAcceptBtn && consentDeclineBtn && predictionResultsContainer && emergencyPopup && emergencyCloseBtn) {

        // Show consent popup
        startPredictionBtn.addEventListener('click', () => {
            consentPopup.classList.remove('d-none');
        });

        // Handle consent decline
        consentDeclineBtn.addEventListener('click', () => {
            consentPopup.classList.add('d-none');
        });

        // Handle consent accept -> Trigger Prediction
        consentAcceptBtn.addEventListener('click', () => {
            consentPopup.classList.add('d-none');
            startPrediction(); // Call the main prediction function
        });

        // Close emergency popup
        emergencyCloseBtn.addEventListener('click', () => {
            emergencyPopup.classList.add('d-none');
        });

    } else {
        console.error("One or more prediction UI elements are missing!");
    }

    // Main function to start the prediction process
    function startPrediction() {
        console.log("Starting prediction process...");
        predictionResultsContainer.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Fetching prediction...</div>'; // Loading indicator

        // 1. Collect current health data from the UI cards
        const healthData = getCurrentHealthData();
        if (!healthData) {
            predictionResultsContainer.innerHTML = '<div class="alert alert-warning">Could not read current health data.</div>';
            return;
        }
        console.log("Collected health data:", healthData);

        // 2. Send data to the Flask server
        fetch('/predict', { // Use relative path assuming Flask serves from the same origin
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(healthData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Received prediction data from /predict:", data); // Log the raw response

                // Check for backend errors first
                if (data.error) {
                    console.error("Prediction API Error:", data.error);
                    predictionResultsContainer.innerHTML = `<div class="alert alert-danger">Prediction Service Error: ${data.error}</div>`;
                    return;
                }

                // Check if the expected 'predictions' array exists and is an array
                if (!data || !Array.isArray(data.predictions)) {
                     console.error("Invalid or missing 'predictions' array in response:", data);
                     predictionResultsContainer.innerHTML = `<div class="alert alert-warning">Received invalid prediction format from server: ${JSON.stringify(data)}</div>`;
                     return;
                }

                 // Check if predictions array is empty (which is valid, means no conditions predicted)
                 if (data.predictions.length === 0) {
                     console.log("Prediction successful: No specific conditions detected.");
                     predictionResultsContainer.innerHTML = `<div class="alert alert-success">No specific health conditions predicted. Current readings appear normal.</div>`;
                     return;
                 }

                // 3. Display prediction results
                displayPredictionResults(data.predictions);

                // 4. Update Health Insights section
                updateHealthInsights(data.predictions, healthData);

            })
            .catch(error => {
                console.error("Fetch Error:", error);
                predictionResultsContainer.innerHTML = `<div class="alert alert-danger">Error: Unable to connect to the prediction service: ${error.message}</div>`;
            });
    }

    // Helper function to get current data for prediction using the latest stored metrics
    function getCurrentHealthData() {
        console.log("Fetching current data for prediction using latestMetrics:", latestMetrics); // Log the source data

        // Basic validation on latestMetrics properties existence
        if (latestMetrics.heartRate === null || latestMetrics.bloodPressureSystolic === null || latestMetrics.bloodPressureDiastolic === null || latestMetrics.spo2 === null || latestMetrics.temperature === null) {
             console.error("latestMetrics object is missing required properties:", latestMetrics);
             predictionResultsContainer.innerHTML = '<div class="alert alert-warning">Internal error: Missing data properties.</div>';
             return null;
        }

         // Ensure values are numbers before sending
         const dataToSend = {
             heart_rate: Number(latestMetrics.heartRate),
             blood_pressure_systolic: Number(latestMetrics.bloodPressureSystolic),
             blood_pressure_diastolic: Number(latestMetrics.bloodPressureDiastolic),
             spo2: Number(latestMetrics.spo2),
             temperature: Number(latestMetrics.temperature),
             glucose: latestMetrics.glucose !== null ? Number(latestMetrics.glucose) : null // Handle potential null glucose
         };

         // Check for NaN values after conversion (excluding glucose which can be null)
         for (const key in dataToSend) {
             // Skip validation for null glucose
             if (key === 'glucose' && dataToSend[key] === null) {
                 continue;
             }
             if (isNaN(dataToSend[key])) {
                 console.error(`Invalid non-numeric data detected in latestMetrics for key "${key}":`, latestMetrics[key]);
                 predictionResultsContainer.innerHTML = `<div class="alert alert-warning">Invalid data detected (${key}: ${latestMetrics[key]}). Cannot proceed with prediction.</div>`;
                 return null; // Prevent sending invalid data
             }
         }
         console.log("Data prepared for prediction API:", dataToSend);
         return dataToSend;
        /* // Original code reading directly from cards - replaced by using latestMetrics
        try {
            const heartRateCard = document.querySelector('.card.border-left-primary');
            const bpCard = document.querySelector('.card.border-left-success');
            const spo2Card = document.querySelector('.card.border-left-info');
            const tempCard = document.querySelector('.card.border-left-warning');

            const heartRate = parseInt(heartRateCard.querySelector('.h5').textContent);
            const bpText = bpCard.querySelector('.h5').textContent;
            const [systolic, diastolic] = bpText.split('/').map(Number);
            const spo2 = parseInt(spo2Card.querySelector('.h5').textContent);
            const temperature = parseFloat(tempCard.querySelector('.h5').textContent);

            // Basic validation
            if (isNaN(heartRate) || isNaN(systolic) || isNaN(diastolic) || isNaN(spo2) || isNaN(temperature)) {
                console.error("Failed to parse health data from cards.");
            return null;
        }

        // Use the globally stored latestMetrics for prediction
        return {
            heart_rate: latestMetrics.heartRate,
            blood_pressure_systolic: latestMetrics.bloodPressureSystolic,
            blood_pressure_diastolic: latestMetrics.bloodPressureDiastolic,
            spo2: latestMetrics.spo2,
            temperature: latestMetrics.temperature,
            glucose: latestMetrics.glucose // Glucose might be null if not simulated/available
        };
    } catch (error) {
            console.error("Error preparing health data:", error);
             predictionResultsContainer.innerHTML = '<div class="alert alert-danger">Error preparing data for prediction.</div>';
            return null;
        }
        */
    }

    // Helper function to update health metric text
    function updateHealthMetricText(cardSelector, value, thresholds, unit) {
        const cardElement = document.querySelector(cardSelector);
        if (cardElement) {
            const statusElement = cardElement.querySelector('.text-xs.text-success');
            if (statusElement) {
                const { status, className } = getStatus(value, thresholds);
                let iconColor = '';
                if (className === 'text-success') {
                    iconColor = '#2ecc71';
                } else if (className === 'text-warning') {
                    iconColor = '#ffcb00';
                } else {
                    iconColor = '#ed5565';
                }
                statusElement.innerHTML = `<i class="fas fa-arrow-right mr-1" style="font-size: .7rem; color: ${iconColor}"></i> <span style="color: ${iconColor}; font-size: .7rem;">${status} (${unit})</span>`;
            }
        }
    }

    // Helper function to display prediction results dynamically
    function displayPredictionResults(predictions) {

        if (!predictions || predictions.length === 0) {
            predictionResultsContainer.innerHTML = '<div class="alert alert-info">No specific conditions predicted at this time.</div>';
            return;
        }

        let resultsHtml = '<ul class="list-group list-group-flush">';
        predictions.forEach(pred => {
            const { condition, probability, severity } = pred;
            let iconClass = 'fas fa-question-circle'; // Default icon
            let severityClass = 'list-group-item-secondary'; // Default severity color
            let severityText = 'Info';

            // Determine icon and color based on condition/severity
            switch (condition.toLowerCase()) {
                case 'hypertension': iconClass = 'fas fa-heartbeat'; break;
                case 'hypotension': iconClass = 'fas fa-heartbeat'; break;
                case 'hyperglycemia': iconClass = 'fas fa-tint'; break; // Droplet for blood sugar
                case 'hypoglycemia': iconClass = 'fas fa-tint'; break;
                case 'hypoxia': case 'hypoxemia': iconClass = 'fas fa-lungs'; break;
                case 'tachycardia': iconClass = 'fas fa-tachometer-alt'; break; // Speedometer
                case 'bradycardia': iconClass = 'fas fa-tachometer-alt'; break;
                case 'fever': iconClass = 'fas fa-thermometer-full'; break;
                case 'hypothermia': iconClass = 'fas fa-thermometer-empty'; break;
                // Add more conditions as needed
            }

            switch (severity.toLowerCase()) {
                case 'low':
                    severityClass = 'list-group-item-success';
                    severityText = 'Low Risk';
                    break;
                case 'medium':
                    severityClass = 'list-group-item-warning';
                    severityText = 'Medium Risk';
                    break;
                case 'high':
                    severityClass = 'list-group-item-danger';
                    severityText = 'High Risk';
                    break;
                case 'critical':
                    severityClass = 'list-group-item-danger font-weight-bold';
                    severityText = 'Critical Risk';
                    break;
            }

            resultsHtml += `
                <li class="list-group-item d-flex justify-content-between align-items-center ${severityClass}">
                    <div>
                        <i class="${iconClass} mr-2"></i>
                        <strong>${condition}</strong>
                    </div>
                    <span class="badge badge-primary badge-pill">${(probability * 100).toFixed(1)}%</span>
                    <span class="badge badge-secondary">${severityText}</span>
                </li>
            `;
        });
        resultsHtml += '</ul>';
        predictionResultsContainer.innerHTML = resultsHtml;

        // Check for critical conditions and show emergency popup if needed
        const criticalPrediction = predictions.find(p => p.severity === 'critical');
        if (criticalPrediction) {
            showEmergencyPopup(criticalPrediction.condition);
        }
    }

    // Helper function to show the emergency popup
    function showEmergencyPopup(condition) {
        const emergencyContent = emergencyPopup.querySelector('.emergency-content p');
        if (emergencyContent) {
            emergencyContent.textContent = `Critical health risk detected: ${condition}. Please seek immediate medical attention or call emergency services.`;
        }
        emergencyPopup.classList.add('d-none');
        emergencyPopup.classList.remove('d-none');
    }

    // --- End of Predictive Health Insight System Logic ---

    // Define health metric thresholds
    const healthThresholds = {
        heartRate: {
            normal: [60, 100],
            medium: [50, 110],
            high: [40, 120]
        },
        bloodPressureSystolic: {
            normal: [90, 120],
            medium: [80, 130],
            high: [70, 140]
        },
        bloodPressureDiastolic: {
            normal: [60, 80],
            medium: [50, 90],
            high: [40, 100]
        },
        spo2: {
            normal: [95, 100],
            medium: [92, 95],
            high: [88, 92]
        },
        temperature: {
            normal: [36.1, 37.2],
            medium: [37.3, 38.0],
            high: [38.1, 39.0]
        },
        glucose: {
            normal: [70, 140],
            medium: [141, 180],
            high: [181, 250]
        }
    };

    function getStatus(value, thresholds) {
        if (value >= thresholds.normal[0] && value <= thresholds.normal[1]) {
            return { status: 'Normal', className: 'text-success' };
        } else if (value >= thresholds.medium[0] && value <= thresholds.medium[1]) {
            return { status: 'Slightly Elevated', className: 'text-warning' };
        } else if (value >= thresholds.high[0] && value <= thresholds.high[1]) {
            return { status: 'Elevated', className: 'text-danger' };
        } else {
            return { status: 'Critical', className: 'text-danger' };
        }
    }

    function startSimulation(type, frequency) {
        console.log(`Starting ${type} simulation (${frequency}ms)`);
        isRunning = true;
        startBtn.textContent = 'Stop Simulation';
        updateStatus(`Running ${type} Health Predictions`, 'text-success');

        // Initial update
        updateMetrics(type);

        // Set up interval
        simulationInterval = setInterval(() => {
            updateMetrics(type);
        }, frequency);
    }

    function startSimulation(type, frequency, selectedDataMode) { // Renamed last parameter for clarity
        console.log(`Starting simulation (${frequency}ms) in ${selectedDataMode} mode`);
        if (isRunning) {
             stopSimulation(); // Stop previous simulation/connection if any
        }
        isRunning = true;
        dataMode = selectedDataMode; // Store the selected mode globally
        startBtn.textContent = 'Stop Simulation';
        updateStatus(`Running ${type} Health Predictions (${dataMode.replace('_', ' ')})`, 'text-success');

         if (dataMode === 'real_device') {
            connectWebSocket();
            // Don't start simulation interval for real device mode
            // UI will be updated by WebSocket messages
         } else {
             // Start simulation interval only for simulated modes
             // Initial update for simulated data
             updateMetrics(type);
             simulationInterval = setInterval(() => {
                 updateMetrics(type);
             }, frequency);
         }
    }

    function stopSimulation() {
        console.log('Stopping simulation');
        clearInterval(simulationInterval);
        isRunning = false;
        startBtn.textContent = 'Start Simulation';
        updateStatus('Health Predictions stopped', 'text-muted');
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close(); // Use close() for native WebSocket
        }
        socket = null;
        updateConnectionStatus('Disconnected', 'text-danger');
    }

    function connectWebSocket() {
        // Use native WebSocket API
        const serverUrl = 'ws://192.168.68.120:5000'; // WebSocket server URL
        console.log(`Attempting to connect to WebSocket: ${serverUrl}`);
        updateConnectionStatus('Connecting...', 'text-warning');

        try {
            socket = new WebSocket(serverUrl);

            socket.onopen = () => {
                console.log('WebSocket connection established');
                updateConnectionStatus('Real Device Connected', 'text-success');

                // Move the event listener attachment here, after socket is initialized
                const updateBtn = document.getElementById('update-data');
                if (updateBtn) {
                    updateBtn.addEventListener('click', () => {
                        requestRealDeviceUpdate();
                    });
                } else {
                    console.error("Update button not found!");
                }
            };

            socket.onclose = (event) => {
                console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
                updateConnectionStatus('Disconnected', 'text-danger');
                socket = null;
            };

           socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                alert(`WebSocket error: ${error.message}`);
                updateConnectionStatus(`Connection Error: ${error.message}`, 'text-danger');
                socket = null;
            };

            socket.onclose = (event) => {
                console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
                let reasonText = `Disconnected: ${event.code}`;
                if (event.reason) {
                    reasonText += ` ${event.reason}`;
                } else {
                    reasonText += " (Abnormal Closure)";
                }
                try {
                    updateConnectionStatus(reasonText, 'text-danger');
                } catch (e) {
                    console.error("Error updating connection status:", e);
                }
                socket = null;
            };

            socket.onmessage = (event) => {
                console.log('Received raw data:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received parsed health metrics:', data);
                    // Ensure data has the expected fields before updating
                    if (data.heart_rate !== undefined && data.blood_pressure_systolic !== undefined && data.blood_pressure_diastolic !== undefined && data.spo2 !== undefined && data.temperature !== undefined) {
                         updateRealDeviceMetrics(data);
                    } else {
                        console.warn('Received incomplete data structure:', data);
                    }
                } catch (e) {
                    console.error('Failed to parse incoming WebSocket message:', e);
                    console.error('Raw message data:', event.data);
                }
            };
        } catch (error) {
             console.error("Failed to initialize WebSocket:", error);
             updateConnectionStatus('Initialization Failed', 'text-danger');
        }
    }

    function updateConnectionStatus(status, className) {
        if (connectionStatusElement) {
            connectionStatusElement.textContent = `> Connection Status: ${status}`;
            connectionStatusElement.className = className;
        }
    }

    function updateRealDeviceMetrics(data) {
        console.log("updateRealDeviceMetrics called with data:", data); // ADDED LOGGING
        console.log("Data received by updateRealDeviceMetrics:", JSON.stringify(data)); // ADDED LOGGING - Inspect the data

        // Check if the required data is present and valid
        if (!data || data.heart_rate === undefined || data.blood_pressure_systolic === undefined || data.blood_pressure_diastolic === undefined || data.spo2 === undefined || data.temperature === undefined || data.glucose === undefined) {
            console.error("Incomplete or invalid data received in updateRealDeviceMetrics:", data);
            alert("Error: Incomplete or invalid data received from real device. Check console for details.");
            return; // Exit the function if data is invalid
        }

        // Update ALL relevant cards with real device data
        document.querySelectorAll('.card.border-left-primary .h5').forEach(el => el.textContent = data.heart_rate);
        document.querySelectorAll('.card.border-left-success .h5').forEach(el => el.textContent = `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}`);
        document.querySelectorAll('.card.border-left-info .h5').forEach(el => el.textContent = data.spo2);
        document.querySelectorAll('.card.border-left-warning .h5').forEach(el => el.textContent = data.temperature.toFixed(1)); // Format temperature

        // Update health statuses for all metrics
        updateHealthMetricText('.card.border-left-primary', data.heart_rate, healthThresholds.heartRate, 'BPM');
        updateHealthMetricText('.card.border-left-success', data.blood_pressure_systolic, healthThresholds.bloodPressureSystolic, 'mmHg');
        updateHealthMetricText('.card.border-left-info', data.spo2, healthThresholds.spo2, 'SpO2%');
        updateHealthMetricText('.card.border-left-warning', data.temperature, healthThresholds.temperature, '°C');

        // Prepare metrics for chart update using all real data
         const chartMetrics = {
            heartRate: data.heart_rate,
            bloodPressureSystolic: data.blood_pressure_systolic,
            bloodPressureDiastolic: data.blood_pressure_diastolic,
            spo2: data.spo2,
            glucose: latestMetrics.glucose, // Keep glucose from simulation (device doesn't send it)
            temperature: parseFloat(data.temperature)
        };

        // Add data point to chart with current timestamp
        if (typeof addDataPoint === 'function') {
            addDataPoint(new Date(), chartMetrics);
        }

        // Update latestMetrics globally with all received data for AI Prediction
        latestMetrics = {
            heartRate: data.heart_rate,
            bloodPressureSystolic: data.blood_pressure_systolic,
            bloodPressureDiastolic: data.blood_pressure_diastolic,
            spo2: data.spo2,
            temperature: data.temperature,
            glucose: latestMetrics.glucose // Keep previous glucose value
        };
    }

    // Removed redundant client-side predictHealthConditions function.
    // Predictions are now handled by the backend via the 'Start Prediction' button.

    function updateMetrics(type) {
        const metrics = {
            heartRate: getRandomValue(60, 100, type === 'Elevated Heart Rate' ? [100, 120] : null),
            bloodPressureSystolic: getRandomValue(110, 130, type === 'Low Blood Pressure' ? [80, 100] : null),
            bloodPressureDiastolic: getRandomValue(70, 90, type === 'Low Blood Pressure' ? [50, 70] : null),
            spo2: getRandomValue(95, 100),
            glucose: getRandomValue(70, 140, type === 'High Glucose' ? [150, 200] : null),
            temperature: getRandomValue(36.0, 37.5, type === 'Elevated Temperature' ? [37.6, 39.0] : null, true) // Added Elevated Temperature simulation
        };

        // Store the latest metrics globally, but only if dataMode is not 'real_device'
        if (dataMode !== 'real_device') {
            latestMetrics = metrics;
        }

        // Removed call to predictHealthConditions(metrics);

        // Update UI with metrics
        document.querySelectorAll('.card.border-left-primary .h5').forEach(el => el.textContent = metrics.heartRate);
        document.querySelectorAll('.card.border-left-success .h5').forEach(el => el.textContent = `${metrics.bloodPressureSystolic}/${metrics.bloodPressureDiastolic}`);
        document.querySelectorAll('.card.border-left-info .h5').forEach(el => el.textContent = metrics.spo2);
        document.querySelectorAll('.card.border-left-warning .h5').forEach(el => el.textContent = metrics.temperature);

        // Update health statuses
        updateHealthMetricText('.card.border-left-primary', metrics.heartRate, healthThresholds.heartRate, 'BPM');
        updateHealthMetricText('.card.border-left-success', metrics.bloodPressureSystolic, healthThresholds.bloodPressureSystolic, 'mmHg');
        updateHealthMetricText('.card.border-left-info', metrics.spo2, healthThresholds.spo2, 'SpO2%');
        updateHealthMetricText('.card.border-left-warning', metrics.temperature, healthThresholds.temperature, '°C');

        // Note: The code block below that dynamically added predictions to '.card.health-status'
        // seems related to the simulation, not the button-triggered prediction.
        // It's removed here to avoid confusion with the dedicated #prediction-results container.
        // If this simulation-based prediction display is still needed, it should be refactored.

        // Parse blood pressure into systolic and diastolic
        const [systolic, diastolic] = [metrics.bloodPressureSystolic, metrics.bloodPressureDiastolic];

        // Prepare metrics for chart update
        const chartMetrics = {
            heartRate: metrics.heartRate,
            bloodPressureSystolic: systolic,
            bloodPressureDiastolic: diastolic,
            spo2: metrics.spo2,
            glucose: metrics.glucose,
            temperature: parseFloat(metrics.temperature)
        };

        // Add data point to chart with current timestamp
        if (typeof addDataPoint === 'function') {
            addDataPoint(new Date(), chartMetrics);
        }
    }

    function updateStatus(message, className) {
        if (statusElement) {
            statusElement.textContent = `> ${message}`;
            statusElement.className = className;
        }
    }

    function getRandomValue(min, max, override = null, isFloat = false) {
        const range = override || [min, max];
        if (isFloat) {
            return (Math.random() * (range[1] - range[0]) + range[0]).toFixed(1);
        }
        return Math.floor(Math.random() * (range[1] - range[0] + 1)) + min;
    }

    console.log('Simulation ready');

    // Add event listener for the "Update Data" button
    const updateBtn = document.getElementById('update-data');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            requestRealDeviceUpdate();
        });
        } else {
            console.error("Update button not found!");
        }

        // Function to request the latest data from the real device
        function requestRealDeviceUpdate() {
            // Data will be pushed from the server automatically.
            console.log("Requesting latest data from real device is no longer needed.");
        }
    }); // End of DOMContentLoaded

    // --- Health Insights Section Logic ---

    const healthConditionExplanations = {
        "Hypertension": "There is a chance of elevated blood pressure, which may indicate hypertension. Monitoring is advised.",
        "Hypoxia": "There is a chance of reduced oxygen levels, which may indicate hypoxia. Consider consulting a healthcare professional.",
        "Hyperglycemia": "There is a chance of elevated blood sugar levels, which may indicate hyperglycemia. Dietary adjustments and monitoring are recommended.",
        "Fever": "There is a chance of elevated body temperature, which may indicate a fever. Rest and hydration are advised.",
        "Bradycardia": "There is a chance of a slow heart rate, which may indicate bradycardia. Further evaluation may be necessary.",
        "Tachycardia": "There is a chance of a fast heart rate, which may indicate tachycardia. Avoiding stimulants and monitoring are recommended.",
        "Hypothermia": "There is a chance of reduced body temperature, which may indicate hypothermia. Warming up and seeking medical advice are advised.",
        "Hyperthermia": "There is a chance of very high body temperature, which may indicate hyperthermia. Immediate medical attention is required.",
        "Hypoglycemia": "There is a chance of low blood sugar levels, which may indicate hypoglycemia. Consuming a small amount of sugar is recommended.",
        "Normal": "All current readings appear within acceptable ranges. No notable health risks detected at this time.",
        "Unable to provide a prediction with current data. Please check input values.": " Unable to provide an insight with current data. Please check input values.",
    };

    const conditionDetails = {
        "Hypertension": { iconClass: 'fas fa-heartbeat', colorClass: 'list-group-item-warning' },
        "Hypoxia": { iconClass: 'fas fa-lungs', colorClass: 'list-group-item-danger' },
        "Hyperglycemia": { iconClass: 'fas fa-tint', colorClass: 'list-group-item-warning' },
        "Fever": { iconClass: 'fas fa-thermometer-full', colorClass: 'list-group-item-warning' },
        "Bradycardia": { iconClass: 'fas fa-tachometer-alt', colorClass: 'list-group-item-warning' },
        "Tachycardia": { iconClass: 'fas fa-tachometer-alt', colorClass: 'list-group-item-warning' },
        "Hypothermia": { iconClass: 'fas fa-thermometer-empty', colorClass: 'list-group-item-danger' },
        "Hyperthermia": { iconClass: 'fas fa-thermometer-full', colorClass: 'list-group-item-danger' },
        "Hypoglycemia": { iconClass: 'fas fa-tint', colorClass: 'list-group-item-warning' }
    };

    function updateHealthInsights(predictions, vitalSigns) {
        const healthInsightsContainer = document.getElementById('health-insights');
        if (!healthInsightsContainer) {
            console.error("Health Insights container not found.");
            return;
        }

        let insightsHTML = "";

        if (!predictions || predictions.length === 0) {
            insightsHTML = `<p>All current readings appear within acceptable ranges. No notable health risks detected at this time.</p>`;
        } else {
            insightsHTML += `<b>Contextual Insights:</b><br>`;

            predictions.forEach(pred => {
                const condition = pred.condition;
                const explanation = healthConditionExplanations[condition];
                 const details = conditionDetails[condition] || { iconClass: 'fas fa-question-circle', colorClass: 'list-group-item-secondary' };
                if (explanation) {
                    insightsHTML += `<p><i class="${details.iconClass} mr-2 ${details.colorClass}"></i>${explanation}</p>`;
                } else {
                    insightsHTML += `<p><i class="${details.iconClass} mr-2 ${details.colorClass}"></i>Possible risk of ${condition}. Consult a healthcare professional.</p>`;
                }
            });
        }

        healthInsightsContainer.innerHTML = insightsHTML;
    }

    // --- End of Health Insights Section Logic ---
