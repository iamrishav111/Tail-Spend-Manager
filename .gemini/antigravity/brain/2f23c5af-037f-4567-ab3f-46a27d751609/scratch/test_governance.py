from backend.agent import TailSpendAIAgent
import json

agent = TailSpendAIAgent()
print("Testing get_governance_advice...")
res = agent.get_governance_advice("MRO Supplies", 1200000, 12)
print(json.dumps(res, indent=2))

print("\nTesting get_consolidation_advice...")
res2 = agent.get_consolidation_advice("Filters", 15, 3, 5000000, {"plants": 4, "plant_names": "Plant A, Plant B, Plant C, Plant D"})
print(json.dumps(res2, indent=2))
