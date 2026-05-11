import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from data_processor import DataEngine

import pandas as pd

try:
    engine = DataEngine()
    df = engine._get_sheet_df('Spend_Transactions')
    contracts_df = engine._get_sheet_df('Contracts_Catalogue')
    
    print("--- Contracts Analysis ---")
    print(f"Contracts shape: {contracts_df.shape}")
    if 'is_active' in contracts_df.columns:
        print("is_active value counts:")
        print(contracts_df['is_active'].value_counts())
    else:
        print("is_active column NOT found in Contracts_Catalogue")
        
    print("\n--- Processed Data Check ---")
    processed_df = engine._process_data_logic(df, contracts_df)
    print(f"Total rows: {len(processed_df)}")
    print(f"Is addressable count: {processed_df['is_addressable'].sum()}")
    print(f"Is maverick count: {processed_df['is_maverick'].sum()}")
    print(f"Leakage amount total: {processed_df['leakage_amt'].sum()}")
    
    if processed_df['is_maverick'].sum() == 0:
        print("\nDEBUG: Why is maverick 0?")
        print(f"mav_cond1 (Pref Supp Used == N) count: {(processed_df['Preferred Supplier Used'] == 'N').sum()}")
        print(f"mav_cond2 (P-Card/Direct) count: {processed_df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct']).sum()}")
        
    # Check Buyer Behaviour output
    bb = engine.get_buyer_behavior()
    print(f"\nBuyer Behaviour records: {len(bb.get('buyer_behavior', []))}")
    if len(bb.get('buyer_behavior', [])) > 0:
        print(f"Top buyer leakage: {bb['buyer_behavior'][0]['leakage']}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
