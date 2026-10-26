import sqlite3
import os

DB_NAME = "ipv6_manager.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Network Segments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_segments (
        segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        segment_type TEXT NOT NULL, -- e.g., 'Lab', 'Hostel', 'WiFi'
        base_ipv6_prefix TEXT NOT NULL, -- e.g., '2001:db8:1000::/48'
        current_prefix_length INTEGER NOT NULL DEFAULT 64,
        allocated_addresses INTEGER DEFAULT 0,
        active_devices INTEGER DEFAULT 0
    );
    """)

    # 2. Historical Usage Table (Time-Series Data for Demand Prediction)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historical_usage (
        usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
        segment_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        device_count INTEGER NOT NULL,
        peak_bandwidth_mbps REAL DEFAULT 0.0,
        day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
        is_weekend INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (segment_id) REFERENCES network_segments(segment_id)
    );
    """)

    # 3. Dynamic Allocation Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS allocation_logs (
        allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        segment_id INTEGER NOT NULL,
        assigned_prefix TEXT NOT NULL, -- e.g., '2001:db8:1000:0001::/64'
        predicted_demand INTEGER NOT NULL,
        allocated_capacity INTEGER NOT NULL,
        action TEXT NOT NULL, -- 'ALLOCATE', 'RECLAIM', 'EXPAND'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (segment_id) REFERENCES network_segments(segment_id)
    );
    """)

    # 4. Anomaly Detection Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomaly_logs (
        anomaly_id INTEGER PRIMARY KEY AUTOINCREMENT,
        segment_id INTEGER NOT NULL,
        anomaly_type TEXT NOT NULL, -- e.g., 'Sudden Usage Spike', 'Duplicate Prefix Request'
        severity TEXT CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) NOT NULL,
        device_count_at_flag INTEGER NOT NULL,
        score REAL NOT NULL, -- Anomaly score from Isolation Forest
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (segment_id) REFERENCES network_segments(segment_id)
    );
    """)

    conn.commit()
    conn.close()
    print(f"Database '{DB_NAME}' initialized successfully!")

if __name__ == "__main__":
    init_db()