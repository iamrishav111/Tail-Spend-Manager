from data_processor import DataEngine
import pandas as pd
import json

try:
    print("Initializing DataEngine...")
    engine = DataEngine()
    
    print("\nTesting get_catalog()...")
    try:
        catalog = engine.get_catalog()
        print(f"Success! Found {len(catalog)} items.")
    except Exception as e:
        print(f"FAILED get_catalog(): {e}")
        import traceback
        traceback.print_exc()

    print("\nTesting classify_purchase('laptop')...")
    try:
        result = engine.classify_purchase("laptop")
        print(f"Success! Result: {result.get('predicted_category')}")
    except Exception as e:
        print(f"FAILED classify_purchase(): {e}")
        import traceback
        traceback.print_exc()

except Exception as e:
    print(f"CRITICAL: Failed to initialize DataEngine: {e}")
    import traceback
    traceback.print_exc()
