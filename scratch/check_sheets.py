import pandas as pd
import requests
import io

SHEET_ID = '1m7xHT4bjK4Hp73TJ_RQaYx18XBW5qjbswO2Td1A7Dpg'

def get_sheet_columns(sheet_name):
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={sheet_name}'
    try:
        response = requests.get(url)
        df = pd.read_csv(io.StringIO(response.text))
        print(f"Sheet: {sheet_name}")
        print(f"Columns: {df.columns.tolist()}")
        print("-" * 20)
    except Exception as e:
        print(f"Error fetching {sheet_name}: {e}")

sheets = ['Spend_Transactions', 'Contracts_Catalogue', 'Supplier_Master', 'Category_Taxonomy']
for s in sheets:
    get_sheet_columns(s)
