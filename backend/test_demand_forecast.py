import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from data_processor import DataEngine

try:
    print("Initializing DataEngine...")
    engine = DataEngine()
    print("DataEngine initialized successfully.")
    
    # Test Demand Forecast
    print("Testing get_demand_forecast...")
    df = engine.get_demand_forecast()
    print(f"Demand Forecast loaded. KPI count: {len(df['kpis'])}")
    print(f"Recurring tail items count: {len(df['recurring_tail_items'])}")
    
    if len(df['recurring_tail_items']) > 0:
        print("First recurring item:", df['recurring_tail_items'][0])
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
