import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import pickle
import os

DB_NAME = os.path.join(os.path.dirname(__file__), '../database/ipv6_manager.db')
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../models/anomaly_detector.pkl')

def train_anomaly_detector():
    """Trains an Isolation Forest model on historical usage data to spot spikes and anomalies."""
    conn = sqlite3.connect(DB_NAME)
    query = "SELECT segment_id, device_count, peak_bandwidth_mbps FROM historical_usage"
    df = pd.read_sql_query(query, conn)
    conn.close()

    if df.empty:
        print("No data found for anomaly detection training.")
        return False

    X = df[['device_count', 'peak_bandwidth_mbps']]

    # Isolation Forest: contamination=0.05 means we expect ~5% anomalies (spikes/outliers)
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    print("Anomaly Detection Model trained and saved successfully!")
    return True

def scan_for_anomalies():
    """Scans recent usage records and flags anomalies into the database."""
    if not os.path.exists(MODEL_PATH):
        train_anomaly_detector()

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Fetch latest usage data for each segment
    query = """
    h.segment_id, h.device_count, h.peak_bandwidth_mbps, s.name 
    FROM historical_usage h
    JOIN network_segments s ON h.segment_id = s.segment_id
    ORDER BY h.timestamp DESC
    LIMIT 10
    """
    # Quick fix to query safely via pandas
    df = pd.read_sql_query("""
    SELECT h.segment_id, h.device_count, h.peak_bandwidth_mbps, s.name 
    FROM historical_usage h
    JOIN network_segments s ON h.segment_id = s.segment_id
    ORDER BY h.timestamp DESC LIMIT 15
    """, conn)

    if df.empty:
        conn.close()
        return []

    X = df[['device_count', 'peak_bandwidth_mbps']]
    predictions = model.predict(X)  # Returns -1 for anomalies, 1 for normal
    scores = model.decision_function(X) # Anomaly score

    flagged_anomalies = []
    for idx, pred in enumerate(predictions):
        if pred == -1:  # Anomaly detected!
            seg_id = int(df.iloc[idx]['segment_id'])
            seg_name = df.iloc[idx]['name']
            devices = int(df.iloc[idx]['device_count'])
            score = float(scores[idx])
            
            severity = 'HIGH' if score < -0.2 else 'MEDIUM'

            # Log into database
            cursor.execute("""
                INSERT INTO anomaly_logs (segment_id, anomaly_type, severity, device_count_at_flag, score)
                VALUES (?, ?, ?, ?, ?)
            """, (seg_id, 'Sudden Usage Spike / Outlier', severity, devices, score))

            flagged_anomalies.append({
                "segment": seg_name,
                "devices": devices,
                "severity": severity,
                "score": round(score, 3)
            })

    conn.commit()
    conn.close()
    print(f"Anomaly Scan complete. Flagged {len(flagged_anomalies)} anomalies.")
    return flagged_anomalies

if __name__ == "__main__":
    train_anomaly_detector()
    anomalies = scan_for_anomalies()
    for a in anomalies:
        print(f"⚠️ ANOMALY DETECTED -> Segment: {a['segment']} | Devices: {a['devices']} | Severity: {a['severity']}")