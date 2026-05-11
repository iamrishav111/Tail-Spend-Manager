import pandas as pd
import pickle
import os

def calculate_final_framework():
    cache_dir = r'c:\Users\rishav.dhar\Desktop\Tail-Spend-Manager-main\backend\.cache'
    
    with open(os.path.join(cache_dir, 'Spend_Transactions.pkl'), 'rb') as f:
        spend_df = pickle.load(f)
    with open(os.path.join(cache_dir, 'Contracts_Catalogue.pkl'), 'rb') as f:
        contracts_df = pickle.load(f)
        
    spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
    spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
    spend_df['Payment Method'] = spend_df['Payment Method'].fillna('').str.strip()
    
    active_contracts = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']
    addressable_categories = set(active_contracts['Category L2'].unique())
    
    # 1. Addressable Universe
    addr_df = spend_df[spend_df['Booked Category'].isin(addressable_categories)].copy()
    addr_universe = addr_df['Amount'].sum()
    
    # 2. Maverick Spend (Refined - within Addressable only)
    cond_a = (addr_df['Preferred Supplier Used'] == 'N')
    cond_b = (addr_df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct']))
    
    maverick_df = addr_df[cond_a | cond_b]
    maverick_total = maverick_df['Amount'].sum()
    
    # 3. On-Contract Spend
    on_contract_total = addr_universe - maverick_total
    
    print(f"ADDR_UNIVERSE:{addr_universe}")
    print(f"MAVERICK_TOTAL:{maverick_total}")
    print(f"ON_CONTRACT_TOTAL:{on_contract_total}")
    print(f"COMPLIANCE_RATE:{(on_contract_total/addr_universe*100):.1f}")

if __name__ == "__main__":
    calculate_final_framework()
