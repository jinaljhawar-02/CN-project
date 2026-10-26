import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import pickle
import os

DB_NAME = os.path.join(os.path.dirname(__file__), '../database/ipv6_manager.db')
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../models/demand_predictor.pkl')

def train_demand_model():
    """Trains a Random Forest Regressor on historical usage data to predict device demand."""
    conn = sqlite3.connect(DB_NAME)
    
    # Query historical data joined with segment metadata
    query = """
    SELECT h.segment_id, h.device_count, h.day_of_week, h.is_weekend, s.segment_type
    FROM historical_usage h
    JOIN network_segments s ON h.segment_id = s.segment_id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    if df.empty:
        print("Error: No historical data found to train model.")
        return False

    # Convert categorical segment_type into numerical features using one-hot encoding
    df = pd.get_dummies(df, columns=['segment_type'], drop_first=True)

    # Features (X) and Target (y)
    # Features: segment_id, day_of_week, is_weekend, and segment types
    feature_columns = [col for col in df.columns if col != 'device_count']
    X = df[feature_columns]
    y = df['device_count']

    # Initialize and train Random Forest model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Ensure models directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Save the trained model to disk
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({'model': model, 'features': feature_columns}, f)

    print("Demand Prediction Model trained and saved successfully!")
    return True

def predict_segment_demand(segment_id, day_of_week, is_weekend, segment_type):
    """Predicts future device demand for a given network segment context."""
    if not os.path.exists(MODEL_PATH):
        print("Model not found. Training model first...")
        train_demand_model()

    with open(MODEL_PATH, 'rb') as f:
        data = pickle.load(f)
        model = data['model']
        feature_columns = data['features']

    # Construct input dataframe matching training feature structure
    input_data = {
        'segment_id': [segment_id],
        'day_of_week': [day_of_week],
        'is_weekend': [is_weekend],
        'segment_type_Hostel': [1 if segment_type == 'Hostel' else 0],
        'segment_type_WiFi': [1 if segment_type == 'WiFi' else 0]
    }
    
    input_df = pd.DataFrame(input_data)
    
    # Align missing columns if any
    for col in feature_columns:
        if col not in input_df.columns:
            input_df[col] = 0
            
    input_df = input_df[feature_columns]

    # Predict device count
    prediction = model.predict(input_df)[0]
    return int(np.ceil(prediction)) # Round up to safely cover device count

if __name__ == "__main__":
    train_demand_model()