import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agent import TailSpendAIAgent
import json

try:
    agent = TailSpendAIAgent()
    print("Agent initialized.")
    
    # Test a mock call to get_strategic_demand_treatment
    print("Testing get_strategic_demand_treatment...")
    res = agent.get_strategic_demand_treatment("SKU-123", "IT Consumables", {
        "total_spend": 50000,
        "txn_count": 10,
        "plants": 2,
        "suppliers": 3
    })
    print(f"Result: {json.dumps(res, indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
