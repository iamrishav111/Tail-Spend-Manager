import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from data_processor import DataEngine
import pandas as pd

try:
    engine = DataEngine()
    contracts_df = engine._get_sheet_df('Contracts_Catalogue')
    print("--- Contracts Analysis ---")
    print(f"Columns: {contracts_df.columns.tolist()}")
    if 'is_active' in contracts_df.columns:
        print("is_active unique values:", contracts_df['is_active'].unique().tolist())
    else:
        print("is_active column NOT found")
        
    df = engine._get_sheet_df('Spend_Transactions')
    print("\n--- Spend Data Analysis ---")
    print(f"Columns: {df.columns.tolist()}")
    print("Booked Category unique samples:", df['Booked Category'].unique()[:5].tolist())
    if 'Category L2' in contracts_df.columns:
        print("Contract Category L2 unique samples:", contracts_df['Category L2'].unique()[:5].tolist())

except Exception as e:
    print(f"Error: {e}")
