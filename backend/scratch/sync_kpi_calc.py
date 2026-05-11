import pandas as pd
import pickle
import os

def calculate_final_sync():
    cache_dir = r'c:\Users\rishav.dhar\Desktop\Tail-Spend-Manager-main\backend\.cache'
    
    with open(os.path.join(cache_dir, 'Spend_Transactions.pkl'), 'rb') as f:
        spend_df = pickle.load(f)
    with open(os.path.join(cache_dir, 'Contracts_Catalogue.pkl'), 'rb') as f:
        contracts_df = pickle.load(f)
    
    # 1. Basic Cleaning
    spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
    spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
    spend_df['Payment Method'] = spend_df['Payment Method'].fillna('').str.strip()
    spend_df['PO Type'] = spend_df['PO Type'].fillna('').str.lower()
    
    # 2. Tail Spend Definition (Standard)
    # Using the logic from data_processor.py: P80 + Spot/Emergency + No Contract + P-Card
    p80 = spend_df.groupby('Booked Category')['Amount'].quantile(0.8).to_dict()
    spend_df['P80'] = spend_df['Booked Category'].map(p80)
    
    # Simple tail check for sync
    is_tail = (spend_df['Amount'] < spend_df['P80']) | \
              (spend_df['PO Type'].isin(['spot', 'emergency'])) | \
              (spend_df['Payment Method'].isin(['P-Card', 'Petty Cash']))
    
    total_tail_spend = spend_df[is_tail]['Amount'].sum()
    tail_suppliers = spend_df[is_tail]['Supplier ID'].nunique()
    
    # 3. Addressable Framework
    active_contracts = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']
    addressable_categories = set(active_contracts['Category L2'].unique())
    
    addr_df = spend_df[spend_df['Booked Category'].isin(addressable_categories)].copy()
    addr_universe = addr_df['Amount'].sum()
    
    # Maverick within Addressable
    cond_a = (addr_df['Preferred Supplier Used'] == 'N')
    cond_b = (addr_df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct']))
    maverick_total = addr_df[cond_a | cond_b]['Amount'].sum()
    on_contract_total = addr_universe - maverick_total
    
    # 4. Coverage
    total_cats = spend_df['Booked Category'].nunique()
    covered_cats = len(addressable_categories.intersection(set(spend_df['Booked Category'].unique())))
    
    print(f"KPI_TOTAL_TAIL:{total_tail_spend}")
    print(f"KPI_ADDRESSABLE:{addr_universe}")
    print(f"KPI_ON_CONTRACT:{on_contract_total}")
    print(f"KPI_MAVERICK:{maverick_total}")
    print(f"KPI_COVERAGE:{(covered_cats/total_cats*100):.1f}")
    print(f"KPI_TAIL_SUPPLIERS:{tail_suppliers}")

if __name__ == "__main__":
    calculate_final_sync()
