from backend.data_processor import DataEngine
engine = DataEngine()
print("Data loaded")
res = engine.get_savings_leakage()
print(res['savings_leakage_extended'].keys())
print("alerts:", len(res['savings_leakage_extended']['alerts']))
print("leakage_category_wise:", len(res['savings_leakage_extended']['leakage_category_wise']))
