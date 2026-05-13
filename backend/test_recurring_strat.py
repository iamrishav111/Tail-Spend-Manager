import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agent import TailSpendAIAgent
import json

try:
    agent = TailSpendAIAgent()
    print("Agent initialized.")
    
    # Test get_recurring_tail_strategy
    print("Testing get_recurring_tail_strategy...")
    res = agent.get_recurring_tail_strategy("SKU-123", 50000, {
        "category": "IT Consumables",
        "frequency_days": 15,
        "plants": 2,
        "avg_variance": 500
    })
    print(f"Result: {json.dumps(res, indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
