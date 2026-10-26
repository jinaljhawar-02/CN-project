import sqlite3
import random
from datetime import datetime, timedelta

DB_NAME = "ipv6_manager.db"

def seed_segments():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    segments = [
        ('Lab-A', 'Lab', '2001:db8:1000::/48', 64, 256, 120),
        ('Lab-B', 'Lab', '2001:db8:2000::/48', 64, 256, 85),
        ('Hostel-Block-1', 'Hostel', '2001:db8:3000::/48', 60, 1024, 650),
        ('Hostel-Block-2', 'Hostel', '2001:db8:4000::/48', 60, 1024, 720),
        ('Campus-WiFi-Central', 'WiFi', '2001:db8:5000::/48', 56, 4096, 2100)
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO network_segments 
    (name, segment_type, base_ipv6_prefix, current_prefix_length, allocated_addresses, active_devices)
    VALUES (?, ?, ?, ?, ?, ?)
    """, segments)

    conn.commit()
    conn.close()
    print("Initial network segments seeded.")

def generate_synthetic_history(days=90):
    """Generates 90 days of daily historical usage data for ML training."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT segment_id, segment_type FROM network_segments")
    segments = cursor.fetchall()

    start_date = datetime.now() - timedelta(days=days)

    records = []
    for day_offset in range(days):
        current_date = start_date + timedelta(days=day_offset)
        day_of_week = current_date.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0

        for seg_id, seg_type in segments:
            # Base device counts depending on segment type
            if seg_type == 'Lab':
                # Labs high on weekdays, low on weekends
                base = 30 if is_weekend else random.randint(100, 220)
            elif seg_type == 'Hostel':
                # Hostels slightly higher on weekends
                base = random.randint(600, 950) if is_weekend else random.randint(500, 800)
            else:  # WiFi
                base = random.randint(1200, 1800) if is_weekend else random.randint(2000, 3500)

            # Introduce a random temporary surge/spike (for anomaly detection testing)
            if random.random() < 0.03:  # 3% chance of anomaly spike
                base = int(base * random.uniform(2.5, 4.0))

            bandwidth = round(base * random.uniform(0.5, 1.8), 2)

            records.append((
                seg_id,
                current_date.strftime("%Y-%m-%d %H:%M:%S"),
                base,
                bandwidth,
                day_of_week,
                is_weekend
            ))

    cursor.executemany("""
    INSERT INTO historical_usage 
    (segment_id, timestamp, device_count, peak_bandwidth_mbps, day_of_week, is_weekend)
    VALUES (?, ?, ?, ?, ?, ?)
    """, records)

    conn.commit()
    conn.close()
    print(f"Generated {len(records)} historical usage logs over {days} days.")

if __name__ == "__main__":
    seed_segments()
    generate_synthetic_history()