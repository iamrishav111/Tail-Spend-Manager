from backend.agent import *

print("Agent 3 tests:")
try:
    print("dormant:", len(detect_dormant_suppliers()))
    print("risk:", len(risk_score_suppliers()))
    print("single source:", len(detect_single_source()))
    print("expiry:", len(contract_expiry_alerts()))
except Exception as e:
    print("Error in Agent 3:", e)

print("Agent 4 tests:")
try:
    print("db data:", len(fetch_db_data()))
    print("leakage:", len(fetch_leakage_data()))
except Exception as e:
    print("Error in Agent 4:", e)
