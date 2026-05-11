import pandas as pd
import pickle
import os

def compare_maverick_frameworks():
    cache_dir = r'c:\Users\rishav.dhar\Desktop\Tail-Spend-Manager-main\backend\.cache'
    
    with open(os.path.join(cache_dir, 'Spend_Transactions.pkl'), 'rb') as f:
        spend_df = pickle.load(f)
    
    with open(os.path.join(cache_dir, 'Contracts_Catalogue.pkl'), 'rb') as f:
        contracts_df = pickle.load(f)
        
    # Data Cleaning
    spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
    spend_df['Quantity'] = pd.to_numeric(spend_df['Quantity'], errors='coerce').fillna(1)
    spend_df['unit_price_paid'] = spend_df['Amount'] / spend_df['Quantity'].replace(0, 1)
    spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
    spend_df['Payment Method'] = spend_df['Payment Method'].fillna('').str.strip()
    
    # Pre-process contracts for lookup
    active_contracts = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']
    contract_prices = active_contracts.groupby(['Category L2', 'Supplier ID'])['Contracted Unit Price'].min().reset_index()
    contract_prices = contract_prices.rename(columns={'Category L2': 'Booked Category', 'Contracted Unit Price': 'contracted_price'})
    
    # Merge contract info into spend
    df = pd.merge(spend_df, contract_prices, on=['Booked Category', 'Supplier ID'], how='left')
    df['has_contract'] = df['contracted_price'].notna()
    
    # --- Framework 1: Addressable Universe (Category-Level) ---
    addressable_categories = set(active_contracts['Category L2'].unique())
    addressable_mask = df['Booked Category'].isin(addressable_categories)
    on_contract_mask = (df['Preferred Supplier Used'] == 'Y') & addressable_mask
    
    f1_universe = df[addressable_mask]['Amount'].sum()
    f1_on_contract = df[on_contract_mask]['Amount'].sum()
    f1_maverick = f1_universe - f1_on_contract
    
    # --- Framework 2: Rule-Bypass (Transaction-Level) ---
    # Condition A1: Direct Bypass (ALL TYPES in addressable category)
    cond_a_all = addressable_mask & (df['Preferred Supplier Used'] == 'N')
    
    # Condition A2: Direct Bypass (SPOT ONLY in addressable category)
    cond_a_spot = addressable_mask & (df['Preferred Supplier Used'] == 'N') & (df['PO Type'].str.lower() == 'spot')
    
    # Condition B: Workflow Bypass (Off-system: P-Card, Petty Cash, or Direct)
    cond_b = df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct'])
    
    # Condition C (Removed from total per request): Price Outliers
    cond_c = df['has_contract'] & (df['unit_price_paid'] > df['contracted_price'] * 1.05)
    
    # F2 Maverick = Union of A and B (Ignoring C as requested)
    df['is_f2_maverick_all'] = cond_a_all | cond_b
    df['is_f2_maverick_spot'] = cond_a_spot | cond_b
    
    f2_maverick_all = df[df['is_f2_maverick_all']]['Amount'].sum()
    f2_maverick_spot = df[df['is_f2_maverick_spot']]['Amount'].sum()
    
    val_a_all = df[cond_a_all]['Amount'].sum()
    val_a_spot = df[cond_a_spot]['Amount'].sum()
    val_b = df[cond_b]['Amount'].sum()
    val_c = df[cond_c]['Amount'].sum()
    
    print("--- Maverick Spend Framework Comparison (Price Outliers Removed) ---")
    print(f"\nFRAMEWORK 1: Strategic Addressable (Top-Down)")
    print(f"MAVERICK SPEND (F1):  INR {f1_maverick:,.2f}")
    
    print(f"\nFRAMEWORK 2: Tactical Rule-Bypass (Bottom-Up)")
    print(f"A1. Direct Bypass (All Types): INR {val_a_all:,.2f}")
    print(f"A2. Direct Bypass (Spot Only):  INR {val_a_spot:,.2f}")
    print(f"B. Workflow Bypass (Off-system): INR {val_b:,.2f}")
    
    print(f"\nRESULTING MAVERICK TOTALS:")
    print(f"Using All Types Bypass + Workflow: INR {f2_maverick_all:,.2f}")
    print(f"Using Spot Only Bypass + Workflow: INR {f2_maverick_spot:,.2f}")
    print(f"\n(Note: Price Outliers of INR {val_c:,.2f} are now EXCLUDED)")

if __name__ == "__main__":
    compare_maverick_frameworks()
