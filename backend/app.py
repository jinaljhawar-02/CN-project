from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

# Add src folder to path so we can import our modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

import sqlite3
from allocator import allocate_subnets_for_all_segments
from detector import scan_for_anomalies
from evaluator import run_simulation

app = Flask(__name__)
CORS(app)  # Enable CORS so React frontend can connect

DB_NAME = os.path.join(os.path.dirname(__file__), 'database/ipv6_manager.db')

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # Returns rows as dictionaries
    return conn

@app.route('/api/segments', methods=['GET'])
def get_segments():
    """Fetch all network segments and their current allocations."""
    conn = get_db_connection()
    segments = conn.execute("SELECT * FROM network_segments").fetchall()
    conn.close()
    return jsonify([dict(row) for row in segments])

@app.route('/api/allocate', methods=['POST'])
def trigger_allocation():
    """Trigger AI demand prediction and dynamic subnet allocation."""
    data = request.get_json() or {}
    day_of_week = data.get('day_of_week', 0)
    is_weekend = data.get('is_weekend', 0)
    
    results = allocate_subnets_for_all_segments(day_of_week, is_weekend)
    return jsonify({
        "status": "success",
        "message": "AI allocation executed successfully",
        "allocations": results
    })

@app.route('/api/anomalies', methods=['GET'])
def get_anomalies():
    """Scan and fetch recent anomalies flagged by Isolation Forest."""
    anomalies = scan_for_anomalies()
    
    # Also fetch from DB logs
    conn = get_db_connection()
    logs = conn.execute("""
        SELECT a.anomaly_id, s.name as segment_name, a.anomaly_type, a.severity, a.device_count_at_flag, a.score, a.timestamp
        FROM anomaly_logs a
        JOIN network_segments s ON a.segment_id = s.segment_id
        ORDER BY a.timestamp DESC LIMIT 20
    """).fetchall()
    conn.close()
    
    return jsonify({
        "recent_scanned": anomalies,
        "database_logs": [dict(row) for row in logs]
    })

@app.route('/api/simulate', methods=['POST'])
def run_evaluation_simulation():
    """Run scalability and comparative benchmark simulation (100 to 10,000 devices)."""
    data = request.get_json() or {}
    device_scale = int(data.get('devices', 1000))
    
    sim_results = run_simulation(device_scale)
    return jsonify(sim_results)

if __name__ == '__main__':
    print("Starting Flask Backend Server for IPv6 Management System...")
    app.run(debug=True, port=5000)