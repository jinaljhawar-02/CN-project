import sqlite3
import os
import ipaddress
from predictor import predict_segment_demand

DB_NAME = os.path.join(os.path.dirname(__file__), '../database/ipv6_manager.db')

def allocate_subnets_for_all_segments(day_of_week=0, is_weekend=0):
    """Dynamically calculates and allocates prefix sizes based on ML demand prediction."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Fetch all network segments
    cursor.execute("SELECT segment_id, name, segment_type, base_ipv6_prefix FROM network_segments")
    segments = cursor.fetchall()

    allocation_results = []

    for seg_id, name, seg_type, base_prefix in segments:
        # 1. Predict demand using Module 1
        predicted_demand = predict_segment_demand(seg_id, day_of_week, is_weekend, seg_type)

        # 2. Determine prefix size based on predicted device count using ipaddress
        if predicted_demand > 2000:
            new_prefix_len = 60  
        elif predicted_demand > 500:
            new_prefix_len = 62
        else:
            new_prefix_len = 64  

        net = ipaddress.ip_network(base_prefix, strict=False)
        subnets = list(net.subnets(new_prefix=new_prefix_len))
        assigned_subnet = str(subnets[0]) if subnets else base_prefix

        # 3. Update segment table with new allocation
        cursor.execute("""
            UPDATE network_segments 
            SET current_prefix_length = ?, active_devices = ?
            WHERE segment_id = ?
        """, (new_prefix_len, predicted_demand, seg_id))

        # 4. Log the allocation event (Storing prefix length instead of 2^64 integer overflow)
        cursor.execute("""
            INSERT INTO allocation_logs (segment_id, assigned_prefix, predicted_demand, allocated_capacity, action)
            VALUES (?, ?, ?, ?, ?)
        """, (seg_id, assigned_subnet, predicted_demand, new_prefix_len, 'ALLOCATE'))

        allocation_results.append({
            "segment": name,
            "type": seg_type,
            "predicted_devices": predicted_demand,
            "assigned_prefix": assigned_subnet,
            "prefix_length": new_prefix_len
        })

    conn.commit()
    conn.close()
    print("Automated Subnet Allocation completed successfully!")
    return allocation_results

if __name__ == "__main__":
    results = allocate_subnets_for_all_segments(day_of_week=1, is_weekend=0)
    for r in results:
        print(f"Segment: {r['segment']} | Demand: {r['predicted_devices']} devices | Prefix: {r['assigned_prefix']}")