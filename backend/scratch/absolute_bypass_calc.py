import pandas as pd
import pickle
import os

def calculate_absolute_bypass():
    cache_dir = r'c:\Users\rishav.dhar\Desktop\Tail-Spend-Manager-main\backend\.cache'
    
    with open(os.path.join(cache_dir, 'Spend_Transactions.pkl'), 'rb') as f:
        spend_df = pickle.load(f)
    with open(os.path.join(cache_dir, 'Contracts_Catalogue.pkl'), 'rb') as f:
        contracts_df = pickle.load(f)
        
    spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
    spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
    spend_df['Payment Method'] = spend_df['Payment Method'].fillna('').str.strip()
    
    # has_contract logic
    active_contracts = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']
    contract_prices = active_contracts.groupby(['Category L2', 'Supplier ID'])['Contracted Unit Price'].min().reset_index()
    contract_prices = contract_prices.rename(columns={'Category L2': 'Booked Category', 'Contracted Unit Price': 'contracted_price'})
    df = pd.merge(spend_df, contract_prices, on=['Booked Category', 'Supplier ID'], how='left')
    df['has_contract'] = df['contracted_price'].notna()
    
    # The two conditions
    cond_a = df['has_contract'] & (df['Preferred Supplier Used'] == 'N')
    cond_b = df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct'])
    
    maverick_df = df[cond_a | cond_b]
    total_maverick = maverick_df['Amount'].sum()
    
    print(f"MAVERICK_TOTAL:{total_maverick}")
    print(f"COND_A_TOTAL:{df[cond_a]['Amount'].sum()}")
    print(f"COND_B_TOTAL:{df[cond_b]['Amount'].sum()}")

if __name__ == "__main__":
    calculate_absolute_bypass()
