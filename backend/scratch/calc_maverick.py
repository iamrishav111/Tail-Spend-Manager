import pandas as pd
import pickle
import os

def calculate_new_maverick():
    cache_dir = r'c:\Users\rishav.dhar\Desktop\Tail-Spend-Manager-main\backend\.cache'
    
    with open(os.path.join(cache_dir, 'Spend_Transactions.pkl'), 'rb') as f:
        spend_df = pickle.load(f)
    
    with open(os.path.join(cache_dir, 'Contracts_Catalogue.pkl'), 'rb') as f:
        contracts_df = pickle.load(f)
        
    # Standardize column names if needed
    spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
    spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
    
    # Identify addressable categories (those that have at least one contract)
    addressable_categories = set(contracts_df['Category L2'].unique())
    
    # Filter for Addressable Spend Universe
    addressable_spend_df = spend_df[spend_df['Booked Category'].isin(addressable_categories)]
    
    # Identify Maverick (Addressable categories where preferred supplier was NOT used)
    maverick_df = addressable_spend_df[addressable_spend_df['Preferred Supplier Used'] == 'N']
    
    total_spend = spend_df['Amount'].sum()
    addressable_spend = addressable_spend_df['Amount'].sum()
    maverick_spend = maverick_df['Amount'].sum()
    
    print(f"Total Spend: {total_spend:,.2f}")
    print(f"Addressable Spend Universe (Categories with Contracts): {addressable_spend:,.2f}")
    print(f"New Maverick Spend (Only 1st Condition): {maverick_spend:,.2f}")
    print(f"Compliance Rate: {((addressable_spend - maverick_spend) / addressable_spend * 100):.1f}%")

if __name__ == "__main__":
    calculate_new_maverick()
