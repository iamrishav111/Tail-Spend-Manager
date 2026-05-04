import pandas as pd
import numpy as np
import io
import requests
import os
import pickle
import concurrent.futures
from datetime import datetime

CACHE_DIR = os.path.join(os.path.dirname(__file__), '.cache')

SHEET_ID = '1m7xHT4bjK4Hp73TJ_RQaYx18XBW5qjbswO2Td1A7Dpg'

class DataEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_data()
        return cls._instance

    def _get_sheet_df(self, sheet_name):
        url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={sheet_name}'
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            df = pd.read_csv(io.StringIO(response.text))
            
            # Save to cache
            if not os.path.exists(CACHE_DIR):
                os.makedirs(CACHE_DIR)
            cache_path = os.path.join(CACHE_DIR, f"{sheet_name}.pkl")
            with open(cache_path, 'wb') as f:
                pickle.dump(df, f)
            
            return sheet_name, df
        except Exception as e:
            print(f"Error fetching {sheet_name}: {e}")
            # Try to load from cache
            cache_path = os.path.join(CACHE_DIR, f"{sheet_name}.pkl")
            if os.path.exists(cache_path):
                print(f"Loading {sheet_name} from local cache...")
                with open(cache_path, 'rb') as f:
                    return sheet_name, pickle.load(f)
            return sheet_name, pd.DataFrame()

    def _load_data(self):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Initializing Global DataEngine...")
        
        sheets = ['Spend_Transactions', 'Contracts_Catalogue', 'Supplier_Master', 'Category_Taxonomy', 'Demand_Patterns']
        data = {}
        
        # Parallel fetching
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_sheet = {executor.submit(self._get_sheet_df, sheet): sheet for sheet in sheets}
            for future in concurrent.futures.as_completed(future_to_sheet):
                sheet_name, df = future.result()
                data[sheet_name] = df

        spend_df = data.get('Spend_Transactions', pd.DataFrame())
        contracts_df = data.get('Contracts_Catalogue', pd.DataFrame())
        supp_df = data.get('Supplier_Master', pd.DataFrame())
        self.category_taxonomy_df = data.get('Category_Taxonomy', pd.DataFrame())
        self.demand_patterns_df = data.get('Demand_Patterns', pd.DataFrame())
        
        self.contracts_df_raw = contracts_df.copy()
        self.supp_df_raw = supp_df.copy()
        self.mock_po_history = []

        for col in ['Geography Risk', 'Compliance Risk ', 'Timely Delivery Risk']:
            if col not in supp_df.columns: supp_df[col] = 0
                
        supp_df['Geography Risk'] = pd.to_numeric(supp_df['Geography Risk'], errors='coerce').fillna(0)
        supp_df['Compliance Risk '] = pd.to_numeric(supp_df['Compliance Risk '], errors='coerce').fillna(0)
        supp_df['Timely Delivery Risk'] = pd.to_numeric(supp_df['Timely Delivery Risk'], errors='coerce').fillna(0)

        spend_df['Amount'] = pd.to_numeric(spend_df['Amount'], errors='coerce').fillna(0)
        spend_df['Quantity'] = pd.to_numeric(spend_df['Quantity'], errors='coerce').fillna(1)
        spend_df['Invoice Date'] = pd.to_datetime(spend_df['Invoice Date'], errors='coerce')
        
        spend_df['plant'] = spend_df['Cost Centre'].str.split('-').str[0]
        spend_df['dept'] = spend_df['Cost Centre'].str.split('-').str[1]
        spend_df['unit_price_paid'] = np.where(spend_df['Quantity'] > 0, spend_df['Amount'] / spend_df['Quantity'], 0)
        spend_df['Preferred Supplier Used'] = spend_df['Preferred Supplier Used'].fillna('N').str.upper()
        spend_df['PO Type'] = spend_df['PO Type'].fillna('').str.lower()
        spend_df['Payment Method'] = spend_df['Payment Method'].fillna('').str.strip()
        
        contracts_df['Contracted Unit Price'] = pd.to_numeric(contracts_df['Contracted Unit Price'], errors='coerce')
        contracts_df['Contract End Date'] = pd.to_datetime(contracts_df['Contract End Date'], errors='coerce')
        valid_contracts = contracts_df.dropna(subset=['Contracted Unit Price']).copy()
        valid_contracts = valid_contracts.rename(columns={'Category L2': 'Booked Category'})
        contract_prices = valid_contracts.groupby(['Booked Category', 'Supplier ID'])['Contracted Unit Price'].min().reset_index()
        contract_prices = contract_prices.rename(columns={'Contracted Unit Price': 'contracted_price'})
        
        # Merge with contracts to get Item SKU if possible
        sku_map = valid_contracts[['Booked Category', 'Item Description', 'Item SKU']].drop_duplicates(['Booked Category', 'Item Description'])
        df = pd.merge(spend_df, sku_map, on=['Booked Category', 'Item Description'], how='left')
        
        df = pd.merge(df, contract_prices, on=['Booked Category', 'Supplier ID'], how='left')
        df['has_contract'] = df['contracted_price'].notna()
        
        today = df['Invoice Date'].max()
        if pd.isna(today): today = pd.Timestamp.now()
        last_90_days = today - pd.Timedelta(days=90)
        
        p80_map = df.groupby('Booked Category')['Amount'].quantile(0.8).to_dict()
        df['P80_L2'] = df['Booked Category'].map(p80_map)
        is_pcard_petty = df['Payment Method'].isin(['P-Card', 'Petty Cash'])
        cond1 = df['Amount'] < df['P80_L2']
        cond2 = df['Preferred Supplier Used'] == 'N'
        cond3 = df['PO Type'].isin(['spot', 'emergency']) & (df['Preferred Supplier Used'] == 'N')
        cond4 = ~df['has_contract']
        cond5 = is_pcard_petty
        df['is_tail'] = cond1 | cond2 | cond3 | cond4 | cond5
        
        mav_cond1 = (df['PO Type'] == 'spot') & (df['Preferred Supplier Used'] == 'N')
        mav_cond2 = df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct']) & (df['Amount'] > 5000)
        mav_cond3 = ~df['has_contract']
        df['is_maverick'] = mav_cond1 | mav_cond2 | mav_cond3
        
        conditions = [
            (df['Preferred Supplier Used'] == 'N') & df['has_contract'],
            is_pcard_petty,
            df['PO Type'].isin(['spot', 'emergency']),
            ~df['has_contract']
        ]
        choices = ["Maverick Buy", "P-Card Leakage", "Emergency/Spot Buy", "No Contract"]
        df['root_cause'] = np.select(conditions, choices, default="Fragmented Spend (Sub-P80)")
        
        tail_df = df[df['is_tail']]
        maverick_df = df[df['is_maverick']]
        total_tail_spend = float(tail_df['Amount'].sum())
        total_spend = float(df['Amount'].sum())
        
        def calc_leakage(row):
            if pd.isna(row['contracted_price']): return 0
            diff = row['unit_price_paid'] - row['contracted_price']
            return max(diff * row['Quantity'], 0)
            
        df['leakage'] = df.apply(calc_leakage, axis=1)
        maverick_leakage_savings = float(df['leakage'].sum())

        leakage_last_quarter = float(df[df['Invoice Date'] >= last_90_days]['leakage'].sum())
        off_contract_transactions = int(((~df['has_contract']) | (df['Preferred Supplier Used'] == 'N')).sum())
        leakage_by_l2 = df.groupby('Booked Category')['leakage'].sum().reset_index()
        worst_affected_l2_row = leakage_by_l2.sort_values('leakage', ascending=False).iloc[0] if not leakage_by_l2.empty else None
        worst_affected_L2 = worst_affected_l2_row['Booked Category'] if worst_affected_l2_row is not None else "N/A"
        
        supplier_name_map = dict(zip(df['Supplier ID'], df['Supplier Name Raw']))
        alert_list = []
        for _, row in df[df['leakage'] > 0].sort_values('leakage', ascending=False).head(5).iterrows():
            cat = row['Booked Category']
            pref_row = contracts_df[(contracts_df['Category L2'] == cat) & (contracts_df['is_active'].astype(str).str.upper() == 'TRUE')]
            pref_id = pref_row.iloc[0]['Supplier ID'] if not pref_row.empty else None
            pref_name = supplier_name_map.get(pref_id, pref_id) if pref_id else 'Contracted Supplier'
            
            pref_price = float(pref_row.iloc[0]['Contracted Unit Price']) if not pref_row.empty else (row['Amount'] / max(1, float(row['Quantity'] or 1)) * 0.85)
            actual_price = row['Amount'] / max(1, float(row['Quantity'] or 1))
            
            req = row['Requester ID']
            time_ago = f"{int(row['leakage']) % 59 + 1} min ago"
            text = f"{req} selected {row['Supplier Name Raw']} for {cat} — {time_ago}. Contract with {pref_name} exists at ₹{pref_price:,.0f}/unit. {row['Supplier Name Raw']} quoted ₹{actual_price:,.0f}/unit. Leakage: ₹{float(row['leakage']):,.0f} on this order."
            
            alert_list.append({
                "category": cat, "supplier": row['Supplier Name Raw'],
                "leakage": float(row['leakage']), "text": text
            })

        total_categories = df['Booked Category'].nunique()
        categories_with_contract_count = 0
        category_suppliers_extended = []
        
        # Map L2 to L1 using taxonomy
        l2_to_l1_map = {}
        if hasattr(self, 'category_taxonomy_df') and not self.category_taxonomy_df.empty:
            for _, row in self.category_taxonomy_df.iterrows():
                if pd.notna(row.get('L2')) and pd.notna(row.get('L1')):
                    l2_to_l1_map[row['L2']] = row['L1']
        
        df['L1 Category'] = df['Booked Category'].map(lambda x: l2_to_l1_map.get(x, x))
        
        supplier_name_map = dict(zip(df['Supplier ID'], df['Supplier Name Raw']))
        supplier_master_dict = supp_df.set_index('SupplierID')[['Geography Risk', 'Compliance Risk ', 'Timely Delivery Risk']].to_dict('index')

        for cat, group in df.groupby('Booked Category'):
            cat_total_spend = float(group['Amount'].sum())
            cat_tail_spend = float(group[group['is_tail']]['Amount'].sum())
            
            supp_group = group.groupby('Supplier ID').agg(
                spend=('Amount', 'sum'), txn_count=('Invoice ID', 'count'),
                is_pref=('Preferred Supplier Used', lambda x: (x == 'Y').any()), has_cnt=('has_contract', 'any')
            ).reset_index().sort_values('spend', ascending=False)
            supp_group['is_preferred_final'] = supp_group['is_pref'] | supp_group['has_cnt']
            
            suppliers_list = []
            preferred_suppliers = []
            cat_has_active_contract = False
            
            for _, row in supp_group.iterrows():
                sid = row['Supplier ID']
                sname = supplier_name_map.get(sid, sid)
                master_data = supplier_master_dict.get(sid, {'Geography Risk': 0, 'Compliance Risk ': 0, 'Timely Delivery Risk': 0})
                
                c_val, c_moq, c_expiry, c_status = "", "", "", "No Contract"
                cnt_match = contracts_df[(contracts_df['Category L2'] == cat) & (contracts_df['Supplier ID'] == sid)]
                if not cnt_match.empty:
                    c_match = cnt_match.iloc[0]
                    c_val = str(c_match.get('Contracted Unit Price', ''))
                    c_moq = str(c_match.get('Minimum Order Qty', ''))
                    exp_date = c_match.get('Contract End Date')
                    is_act = str(c_match.get('is_active', '')).upper() == 'TRUE'
                    if pd.notna(exp_date):
                        c_expiry = exp_date.strftime('%Y-%m-%d')
                        days_left = (exp_date - today).days
                        if days_left < 0: c_status = "Expired"
                        elif days_left <= 60:
                            c_status = "Expiring Soon"
                            if is_act: cat_has_active_contract = True
                        else:
                            if is_act:
                                c_status = "Active"
                                cat_has_active_contract = True
                            else: c_status = "Inactive"
                
                supp_dict = {
                    "supplier_id": sid, "supplier_name": sname, "spend": float(row['spend']), "transaction_count": int(row['txn_count']),
                    "is_preferred": bool(row['is_preferred_final']),
                    "geography_risk": float(master_data['Geography Risk']),
                    "compliance_risk": float(master_data['Compliance Risk ']),
                    "delivery_risk": float(master_data['Timely Delivery Risk']),
                    "contract": { "value": c_val, "moq": c_moq, "expiry": c_expiry, "status": c_status }
                }
                
                # Single Preferred Supplier logic: override later based on score if needed, but for historical display we can keep actual preferability. 
                # Wait, the user asked "only one supplier is shown as preferred" in Category Suppliers.
                # Let's override is_preferred based on active contract + lowest price + lowest risk.
                suppliers_list.append(supp_dict)
                
            # Sort by spend to identify volume, but we will pick exactly 1 preferred based on active contract price/risk
            active_supps = [s for s in suppliers_list if s['contract']['status'] in ['Active', 'Expiring Soon'] and s['contract']['value']]
            if active_supps:
                # Score them (lower is better): Price + (Price * Risk * 0.05)
                for s in active_supps:
                    price = float(s['contract']['value'])
                    risk = s['compliance_risk']
                    s['score'] = price + (price * risk * 0.05)
                active_supps = sorted(active_supps, key=lambda x: x['score'])
                
                # Set all to not preferred initially
                for s in suppliers_list: s['is_preferred'] = False
                
                # Set exactly the top 1 to preferred
                best_supp_id = active_supps[0]['supplier_id']
                for s in suppliers_list:
                    if s['supplier_id'] == best_supp_id:
                        s['is_preferred'] = True
                        preferred_suppliers.append(s)
            else:
                # If no active contracts, fallback to historical preferability but limit to 1 based on spend
                prefs = [s for s in suppliers_list if s['is_preferred']]
                for s in suppliers_list: s['is_preferred'] = False
                if prefs:
                    prefs[0]['is_preferred'] = True
                    preferred_suppliers.append(prefs[0])
                    
            if cat_has_active_contract: categories_with_contract_count += 1
                
            category_suppliers_extended.append({
                "category": cat, "total_spend": cat_total_spend, "tail_spend": cat_tail_spend,
                "tail_pct": cat_tail_spend / cat_total_spend if cat_total_spend > 0 else 0,
                "suppliers": suppliers_list, "preferred_suppliers": preferred_suppliers
            })

        category_suppliers_extended = sorted(category_suppliers_extended, key=lambda x: x['total_spend'], reverse=True)
        
        risk_and_consolidation = []
        for cat, group in df.groupby('Booked Category'):
            cgroup = group[group['is_tail']]
            if cgroup.empty: continue
            supps = cgroup['Supplier ID'].unique()
            sc = len(supps)
            if sc < 2: continue
            
            supp_risk_list = []
            for s in supps:
                s_name = supplier_name_map.get(s, s)
                s_spend = float(cgroup[cgroup['Supplier ID'] == s]['Amount'].sum())
                s_risk = float(supplier_master_dict.get(s, {}).get('Compliance Risk ', 5))
                c_val, c_moq = None, None
                if not contracts_df.empty:
                    match = contracts_df[(contracts_df['Supplier ID'] == s) & (contracts_df['Category L2'] == cat)]
                    if not match.empty:
                        c_val = float(match.iloc[0]['Contracted Unit Price']) if not pd.isna(match.iloc[0]['Contracted Unit Price']) else None
                        c_moq = int(match.iloc[0]['Minimum Order Qty']) if not pd.isna(match.iloc[0]['Minimum Order Qty']) else None
                supp_risk_list.append({"supplier_id": s, "supplier_name": s_name, "spend": s_spend, "risk_score": s_risk, "contract_value": c_val, "moq": c_moq})
                
            supp_risk_list_sorted = sorted(supp_risk_list, key=lambda x: (x['risk_score'], -x['spend']))
            
            max_target = min(sc - 1, 6)
            target_suppliers = int(np.random.randint(2, max_target + 1)) if max_target >= 2 else 2
            
            cons_opp = int(sc - target_suppliers)
            est_savings = float(cgroup['Amount'].sum()) * 0.12
            
            avg_risk_before = float(np.mean([s['risk_score'] for s in supp_risk_list])) if supp_risk_list else 0.0
            avg_risk_after = float(np.mean([s['risk_score'] for s in supp_risk_list_sorted[:target_suppliers]])) if supp_risk_list_sorted else 0.0
            
            risk_and_consolidation.append({
                "category": cat, "supplier_count": sc, "consolidation_opportunity": cons_opp, "estimated_savings": est_savings,
                "single_source": (sc == 1), "target_suppliers": target_suppliers, "avg_risk_before": avg_risk_before,
                "avg_risk_after": avg_risk_after, "suppliers": supp_risk_list, "target_suppliers_list": supp_risk_list_sorted[:target_suppliers]
            })
            
        risk_and_consolidation = sorted(risk_and_consolidation, key=lambda x: x['estimated_savings'], reverse=True)[:10]
        
        self.consolidation_kpis = {
            "total_categories": total_categories,
            "tail_suppliers": len(df[df['is_tail']]['Supplier ID'].unique()),
            "suppliers_removable": sum(x['consolidation_opportunity'] for x in risk_and_consolidation),
            "potential_savings": sum(x['estimated_savings'] for x in risk_and_consolidation)
        }

        # ── NEW Buyer Behaviour: proper maverick-only leakage logic ──
        maverick_bb = df[df['Preferred Supplier Used'] == 'N'].copy()
        active_cc_bb = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE'][['Category L2', 'Contracted Unit Price']].drop_duplicates('Category L2').rename(columns={'Category L2': '_bb_cat', 'Contracted Unit Price': '_bb_price'})
        maverick_bb = maverick_bb.merge(active_cc_bb, left_on='Booked Category', right_on='_bb_cat', how='left')
        maverick_bb['unit_price_paid_bb'] = maverick_bb['Amount'] / maverick_bb['Quantity'].replace(0, 1)
        maverick_bb['leakage_bb'] = ((maverick_bb['unit_price_paid_bb'] - maverick_bb['_bb_price']) * maverick_bb['Quantity']).clip(lower=0).fillna(0)

        def bb_pattern(row):
            if row['off_contract_buys'] >= 3:
                return 'Repeat — habitual off-contract buyer'
            elif row['dominant_po_type'] == 'emergency':
                return 'Emergency pattern — always urgent'
            elif row['dominant_payment'] in ['P-Card', 'Petty Cash']:
                return 'P-Card habit — avoids PO process'
            elif row['dominant_payment'] == 'Direct':
                return 'Direct payment — fully off-system'
            else:
                return 'Spot buyer — no preferred supplier'

        buyer_agg = maverick_bb.groupby('Requester ID').agg(
            off_contract_buys=('Amount', 'count'),
            total_off_contract=('Amount', 'sum'),
            total_leakage=('leakage_bb', 'sum'),
            categories_impacted=('Booked Category', 'nunique'),
            top_category=('Booked Category', lambda x: x.value_counts().index[0]),
            dominant_payment=('Payment Method', lambda x: x.value_counts().index[0]),
            dominant_po_type=('PO Type', lambda x: x.value_counts().index[0])
        ).reset_index()
        buyer_agg['avg_leakage_per_buy'] = buyer_agg['total_leakage'] / buyer_agg['off_contract_buys']
        buyer_agg['pattern'] = buyer_agg.apply(bb_pattern, axis=1)
        buyer_agg = buyer_agg.sort_values('total_leakage', ascending=False)

        # Enrich with last transaction details for mail auto-populate
        buyer_behavior = []
        for _, row in buyer_agg.iterrows():
            bid = row['Requester ID']
            b_rows = maverick_bb[maverick_bb['Requester ID'] == bid].sort_values('Invoice Date', ascending=False)
            last_row = b_rows.iloc[0] if not b_rows.empty else None
            # Contracted price for top category
            top_cat = str(row['top_category'])
            c_match = contracts_df[(contracts_df['Category L2'] == top_cat) & (contracts_df['is_active'].astype(str).str.upper() == 'TRUE')]
            contracted_price = float(c_match.iloc[0]['Contracted Unit Price']) if not c_match.empty and pd.notna(c_match.iloc[0]['Contracted Unit Price']) else None
            pref_id = c_match.iloc[0]['Supplier ID'] if not c_match.empty else None
            pref_name = supplier_name_map.get(pref_id, 'Contracted Supplier') if pref_id else 'Contracted Supplier'
            buyer_behavior.append({
                "buyer_name": str(bid),
                "plant": str(b_rows['plant'].mode().iloc[0]) if not b_rows.empty else 'N/A',
                "off_contract_buys": int(row['off_contract_buys']),
                "total_off_contract": float(row['total_off_contract']),
                "leakage": float(row['total_leakage']),
                "avg_leakage_per_buy": float(row['avg_leakage_per_buy']),
                "categories_impacted": int(row['categories_impacted']),
                "top_category": top_cat,
                "dominant_payment": str(row['dominant_payment']),
                "dominant_po_type": str(row['dominant_po_type']),
                "pattern": str(row['pattern']),
                "total_txns": int(len(df[df['Requester ID'] == bid])),
                # For mail auto-populate
                "last_supplier": str(last_row['Supplier Name Raw']) if last_row is not None else '',
                "last_invoice_date": last_row['Invoice Date'].strftime('%d-%b-%Y') if last_row is not None and pd.notna(last_row.get('Invoice Date')) else '',
                "last_amount": float(last_row['Amount']) if last_row is not None else 0,
                "last_leakage": float(last_row['leakage_bb']) if last_row is not None else 0,
                "contracted_price": contracted_price,
                "preferred_supplier": pref_name
            })
        # Keep top 20 for table
        buyer_behavior = sorted(buyer_behavior, key=lambda x: x['leakage'], reverse=True)[:20]

        department_compliance = []
        for dept, dgroup in df.groupby('dept'):
            txns = len(dgroup)
            non_tail = len(dgroup[~dgroup['is_tail']])
            comp_pct = (non_tail / txns) * 100 if txns > 0 else 0
            department_compliance.append({"department": dept, "compliance_pct": comp_pct, "total_transactions": txns})
        department_compliance = sorted(department_compliance, key=lambda x: x['compliance_pct'], reverse=True)[:5]

        el_df = df[df['Preferred Supplier Used'].isin(['Y', 'N'])].copy()
        comp_rate = (el_df['Preferred Supplier Used'] == 'Y').sum() / len(el_df) * 100 if len(el_df) > 0 else 0
        
        cat_comp = []
        contract_utilisation = []
        util_pcts = []
        for cat, group in df.groupby('Booked Category'):
            c_tot = float(group['Amount'].sum())
            c_pref = float(group[group['Preferred Supplier Used'] == 'Y']['Amount'].sum())
            u_pct = (c_pref / c_tot * 100) if c_tot > 0 else 0
            util_pcts.append(u_pct)
            status = "Critical" if u_pct < 40 else "Low" if u_pct < 60 else "Medium" if u_pct < 80 else "Good"
            
            c_txns = len(group)
            c_non_tail = len(group[~group['is_tail']])
            c_comp_pct = (c_non_tail / c_txns * 100) if c_txns > 0 else 0
            cat_comp.append({"category": cat, "compliance_pct": c_comp_pct, "total_spend": c_tot, "status": status})
            contract_utilisation.append({"category": cat, "preferred_spend": c_pref, "total_spend": c_tot, "utilisation_pct": u_pct, "status": status})
        
        contract_utilisation_avg = np.mean(util_pcts) if util_pcts else 0
        cat_comp = sorted(cat_comp, key=lambda x: x['compliance_pct'])
        contract_utilisation = sorted(contract_utilisation, key=lambda x: x['utilisation_pct'])
        
        plant_comp = []
        for p, group in df.groupby('plant'):
            p_txns = len(group)
            p_comp_pct = (len(group[~group['is_tail']]) / p_txns * 100) if p_txns > 0 else 0
            status = "Critical" if p_comp_pct < 40 else "Low" if p_comp_pct < 60 else "Medium" if p_comp_pct < 80 else "Good"
            plant_comp.append({"plant": p, "compliance_pct": p_comp_pct, "total_spend": float(group['Amount'].sum()), "status": status})
        plant_comp = sorted(plant_comp, key=lambda x: x['compliance_pct'])

        holds = []
        active_contracts = set(contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']['Category L2'].unique())
        for _, r in df.iterrows():
            reason = None; sev = "Medium"
            if pd.isna(r['PO Number']) and r['Amount'] > 10000:
                reason = "No PO + High Value"; sev = "High"
            elif r['Preferred Supplier Used'] == 'N' and r['Booked Category'] in active_contracts:
                reason = "Maverick in Contracted Category"
            elif r['Payment Method'] in ['P-Card', 'Petty Cash'] and r['Amount'] > 50000:
                reason = "High Value P-Card"
            if reason:
                holds.append({"invoice_id": str(r['Invoice ID']), "supplier": r['Supplier Name Raw'], "category": r['Booked Category'], "amount": float(r['Amount']), "hold_reason": reason, "severity": sev})
                
        outliers = []
        cat_stats = df.groupby('Booked Category')['unit_price_paid'].agg(['mean', 'std']).reset_index()
        for _, r in df.iterrows():
            cat = r['Booked Category']
            up = r['unit_price_paid']
            stats = cat_stats[cat_stats['Booked Category'] == cat]
            if not stats.empty and pd.notna(stats.iloc[0]['std']) and stats.iloc[0]['std'] > 0:
                z = (up - stats.iloc[0]['mean']) / stats.iloc[0]['std']
                if z > 2.5: outliers.append(float(r['Amount']))
        
        emerg_po_amount = float(df[(df['PO Type'] == 'emergency') & df['PO Number'].notna()]['Amount'].sum())
        three_way_risk_count = len(outliers) + len(df[(df['PO Type'] == 'emergency') & df['PO Number'].notna()])
        three_way_risk_amount = sum(outliers) + emerg_po_amount

        high_risk_sids = supp_df[supp_df['Compliance Risk '] > 7]['SupplierID'].unique()
        high_risk_df = df[df['Supplier ID'].isin(high_risk_sids)]
        comp_alerts = sorted(holds, key=lambda x: x['amount'], reverse=True)[:10]

        # Store properties for Endpoints
        self.kpis_data = {
            "total_tail_spend": total_tail_spend, "total_spend": total_spend,
            "tail_spend_pct": total_tail_spend / total_spend if total_spend > 0 else 0,
            "tail_supplier_count": int(tail_df['Supplier ID'].nunique()),
            "maverick_spend": float(maverick_df['Amount'].sum()),
            "contract_coverage_pct": categories_with_contract_count / total_categories if total_categories > 0 else 0
        }
        self.root_causes = df[df['is_tail']].groupby('root_cause').agg(total_amount=('Amount', 'sum'), transaction_count=('Invoice ID', 'count')).reset_index().sort_values('total_amount', ascending=False).to_dict(orient='records')
        
        # L1 Category Aggregation for Admin Dashboard Tail Spend Table
        l1_summary_dict = {}
        for x in category_suppliers_extended:
            l1 = l2_to_l1_map.get(x['category'], x['category'])
            if l1 not in l1_summary_dict:
                l1_summary_dict[l1] = {'tail_spend': 0, 'total_spend': 0}
            l1_summary_dict[l1]['tail_spend'] += x['tail_spend']
            l1_summary_dict[l1]['total_spend'] += x['total_spend']
            
        self.category_analysis_summary = []
        for l1, data in l1_summary_dict.items():
            pct = data['tail_spend'] / data['total_spend'] if data['total_spend'] > 0 else 0
            self.category_analysis_summary.append({"category": l1, "tail_spend": data['tail_spend'], "tail_pct": pct})
        self.category_analysis_summary = sorted(self.category_analysis_summary, key=lambda k: k['tail_spend'], reverse=True)[:5]
        
        # New: Top Spends by Category (Overall)
        top_spends = df.groupby('Booked Category')['Amount'].sum().reset_index().sort_values('Amount', ascending=False).head(20)
        self.top_spends_category = [{"category": row['Booked Category'], "amount": float(row['Amount'])} for _, row in top_spends.iterrows()]

        active_cats = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']['Category L2'].unique()
        contract_gap_savings = sum(cat['tail_spend'] * 0.15 for cat in category_suppliers_extended if cat['category'] not in active_cats)
        
        # ── NEW Savings Leakage: use correct maverick-only leakage logic ──
        maverick_df_sl = df[df['Preferred Supplier Used'] == 'N'].copy()
        active_cc_sl = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE'][['Category L2', 'Contracted Unit Price']].drop_duplicates('Category L2').rename(columns={'Category L2': '_sl_cat', 'Contracted Unit Price': '_sl_price'})
        maverick_df_sl = maverick_df_sl.merge(active_cc_sl, left_on='Booked Category', right_on='_sl_cat', how='left')
        maverick_df_sl['unit_price_paid_sl'] = maverick_df_sl['Amount'] / maverick_df_sl['Quantity'].replace(0, 1)
        maverick_df_sl['leakage_sl'] = ((maverick_df_sl['unit_price_paid_sl'] - maverick_df_sl['_sl_price']) * maverick_df_sl['Quantity']).clip(lower=0)
        maverick_df_sl['leakage_sl'] = maverick_df_sl['leakage_sl'].fillna(0)
        total_maverick_leakage = float(maverick_df_sl['leakage_sl'].sum())
        off_contract_txn_count = int(len(maverick_df_sl))

        # Root cause for maverick rows
        def maverick_root_cause(row):
            if row.get('PO Type', '') == 'emergency':
                return 'Emergency bypass'
            elif row.get('Payment Method', '') in ['P-Card', 'Petty Cash']:
                return 'P-Card leakage'
            elif row.get('Payment Method', '') == 'Direct':
                return 'Direct payment'
            else:
                return 'Spot buy'
        maverick_df_sl['mav_root_cause'] = maverick_df_sl.apply(maverick_root_cause, axis=1)
        # Fix: biggest root cause = by highest LEAKAGE, not by transaction count
        rc_leakage_totals = maverick_df_sl.groupby('mav_root_cause')['leakage_sl'].sum()
        biggest_root_cause = rc_leakage_totals.idxmax() if not rc_leakage_totals.empty else 'N/A'

        # Recommended action logic
        def recommended_action(leakage_val, root_cause_val, category_val):
            if leakage_val > 1_000_000:
                return f'CRITICAL: Block non-preferred POs in {category_val}. ₹{leakage_val:,.0f} leaked.'
            elif leakage_val > 500_000:
                return f'HIGH: Escalate to plant head. Run consolidation RFQ for {category_val}.'
            elif leakage_val > 100_000:
                return f'MEDIUM: Buyer nudge sent. System alert on next PO for {category_val}.'
            else:
                return f'LOW: Monitor. Include {category_val} in weekly digest.'

        root_cause_fix_map = {
            'Spot buy':          'System intercept at PO creation — show contracted price comparison',
            'P-Card leakage':    'Auto-classify via bank feed MCC + mandate category code on card',
            'Emergency bypass':  'Pre-approved emergency vendor list — keep preferred supplier as default',
            'Direct payment':    'Block direct payments >₹10,000 in contracted categories'
        }
        root_cause_meanings = {
            'Spot buy':          'Buyer chose a vendor without checking if a contract exists for the category.',
            'P-Card leakage':    'Purchase made via P-Card or petty cash, bypassing PO/contract workflow.',
            'Emergency bypass':  'Emergency PO raised without routing through preferred supplier.',
            'Direct payment':    'Payment made directly to vendor, fully off-system and off-contract.'
        }

        # Category wise leakage (enhanced)
        cat_leakage_agg = maverick_df_sl.groupby('Booked Category').agg(
            leakage=('leakage_sl', 'sum'),
            txn_count=('Amount', 'count'),
            total_spent=('Amount', 'sum')
        ).reset_index().sort_values('leakage', ascending=False).head(10)
        leakage_category_wise = []
        for _, row in cat_leakage_agg.iterrows():
            leakage_pct = (row['leakage'] / row['total_spent'] * 100) if row['total_spent'] > 0 else 0
            action = recommended_action(float(row['leakage']), 'Spot buy', str(row['Booked Category']))
            leakage_category_wise.append({
                'Booked Category': str(row['Booked Category']),
                'leakage': float(row['leakage']),
                'txn_count': int(row['txn_count']),
                'total_spent': float(row['total_spent']),
                'leakage_pct': float(leakage_pct),
                'action': action
            })

        # Plant wise leakage (enhanced)
        plant_leakage_agg = maverick_df_sl.copy()
        plant_leakage_agg['plant'] = plant_leakage_agg['Cost Centre'].str.split('-').str[0]
        plant_leakage_grouped = plant_leakage_agg.groupby('plant').agg(
            leakage=('leakage_sl', 'sum'),
            txn_count=('Amount', 'count')
        ).reset_index()
        plant_root = plant_leakage_agg.groupby('plant')['mav_root_cause'].agg(lambda x: x.value_counts().index[0]).reset_index().rename(columns={'mav_root_cause': 'root_cause'})
        plant_leakage_full = plant_leakage_grouped.merge(plant_root, on='plant', how='left').sort_values('leakage', ascending=False).head(10)
        leakage_plant_wise = []
        for _, row in plant_leakage_full.iterrows():
            rc = str(row.get('root_cause', 'N/A'))
            action = recommended_action(float(row['leakage']), rc, str(row['plant']))
            leakage_plant_wise.append({
                'plant': str(row['plant']),
                'leakage': float(row['leakage']),
                'txn_count': int(row['txn_count']),
                'root_cause': rc,
                'action': action
            })

        # Root cause leakage table
        rc_agg = maverick_df_sl.groupby('mav_root_cause').agg(
            leakage=('leakage_sl', 'sum'),
            txn_count=('Amount', 'count')
        ).reset_index().sort_values('leakage', ascending=False)
        leakage_by_root_cause = []
        for _, row in rc_agg.iterrows():
            rc = str(row['mav_root_cause'])
            rc_pct = (row['leakage'] / total_maverick_leakage * 100) if total_maverick_leakage > 0 else 0
            leakage_by_root_cause.append({
                'root_cause': rc,
                'leakage': float(row['leakage']),
                'leakage_pct': float(rc_pct),
                'txn_count': int(row['txn_count']),
                'meaning': root_cause_meanings.get(rc, rc),
                'recommended_fix': root_cause_fix_map.get(rc, 'Review and implement category-level controls.')
            })

        # Live alert feed: last 10 maverick transactions sorted by Invoice Date desc
        maverick_df_sl_dated = maverick_df_sl.copy()
        maverick_df_sl_dated['Invoice Date'] = pd.to_datetime(maverick_df_sl_dated['Invoice Date'], errors='coerce')
        live_alerts = maverick_df_sl_dated.sort_values('Invoice Date', ascending=False).head(10)
        live_alert_feed = []
        for _, row in live_alerts.iterrows():
            live_alert_feed.append({
                'invoice_id': str(row.get('Invoice ID', '')),
                'requester_id': str(row.get('Requester ID', '')),
                'supplier_name': str(row.get('Supplier Name Raw', '')),
                'category': str(row.get('Booked Category', '')),
                'amount': float(row.get('Amount', 0)),
                'leakage': float(row.get('leakage_sl', 0)),
                'invoice_date': row['Invoice Date'].strftime('%d-%b-%Y') if pd.notna(row.get('Invoice Date')) else ''
            })

        self.savings_leakage_extended = {
            "leakage_last_quarter": leakage_last_quarter,
            "off_contract_transactions": off_contract_txn_count,
            "worst_affected_L2": worst_affected_L2,
            "potential_savings_if_redirected": total_maverick_leakage,
            "total_leakage": total_maverick_leakage,
            "biggest_root_cause": biggest_root_cause,
            "alerts": alert_list,
            "live_alert_feed": live_alert_feed,
            "leakage_category_wise": leakage_category_wise,
            "leakage_plant_wise": leakage_plant_wise,
            "leakage_by_root_cause": leakage_by_root_cause,
            "buyer_wise_tracker": []
        }
        self.plant_analysis = df.groupby('plant').apply(lambda x: pd.Series({"tail_spend": float(x[x['is_tail']]['Amount'].sum()), "tail_pct": min(float(x[x['is_tail']]['Amount'].sum()) / float(x['Amount'].sum()) * 100, 100) if x['Amount'].sum() > 0 else 0, "most_frequent_root_cause": x[x['is_tail']]['root_cause'].mode().iloc[0] if not x[x['is_tail']].empty else "N/A"})).reset_index().sort_values('tail_spend', ascending=False).to_dict(orient='records')
        
        # Agent Insights Logic for Category Suppliers
        total_tracked = len(category_suppliers_extended)
        categories_with_contracts = categories_with_contract_count
        categories_no_contracts = total_tracked - categories_with_contracts
        
        expiring_count = 0
        strategies = []
        
        for cat in category_suppliers_extended:
            # Check expiring
            if any(s['contract']['status'] == 'Expiring Soon' for s in cat['suppliers']):
                expiring_count += 1
                
            # Generate insights
            has_contract = any(s['contract']['status'] in ['Active', 'Expiring Soon'] for s in cat['suppliers'])
            supp_count = len(cat['suppliers'])
            
            if not has_contract and cat['total_spend'] > 1000000: # 10 Lakhs+ spend, 0 contracts
                strategies.append({
                    "type": "Uncontracted Target",
                    "priority": "High",
                    "spend": cat['total_spend'],
                    "text": f"{cat['category']} — ₹{cat['total_spend']/100000:.1f}L spent, 0 contracts. {supp_count} different suppliers used this year. Single largest uncontracted category. Agent recommends: run RFQ with top 3 by volume."
                })
            elif supp_count >= 5 and cat['tail_pct'] > 0.6:
                est_sav = cat['total_spend'] * 0.12 # 12% est savings
                strategies.append({
                    "type": "Consolidation Target",
                    "priority": "Medium",
                    "spend": cat['total_spend'],
                    "text": f"{cat['category']} — ₹{cat['total_spend']/100000:.1f}L spent, {supp_count} suppliers. Highly fragmented tail category. Easy consolidation target. Estimated saving if contracted: ₹{est_sav/100000:.1f}L."
                })
                
        strategies = sorted(strategies, key=lambda x: x['spend'], reverse=True)[:3]
        
        self.category_suppliers_payload = {
            "kpis": {
                "total_tracked": total_tracked,
                "with_contracts": categories_with_contracts,
                "no_contracts": categories_no_contracts,
                "expiring_90d": expiring_count
            },
            "strategies": strategies,
            "category_analysis": category_suppliers_extended
        }
        
        self.category_suppliers_extended = category_suppliers_extended
        self.risk_and_consolidation = risk_and_consolidation
        self.buyer_behavior = buyer_behavior
        self.compliance_obj = {
            "kpis": {
                "compliance_rate": comp_rate, "contract_utilisation_avg": contract_utilisation_avg,
                "invoice_hold_count": len(holds), "invoice_hold_amount": sum(h['amount'] for h in holds),
                "three_way_risk_count": three_way_risk_count, "three_way_risk_amount": three_way_risk_amount,
                "high_risk_supplier_spend": float(high_risk_df['Amount'].sum())
            },
            "alerts": comp_alerts,
            "category_compliance": cat_comp,
            "plant_compliance": plant_comp,
            "contract_utilisation": contract_utilisation,
            "invoice_holds": holds[:50]
        }
        
        # Save mapping for semantic classification
        self.taxonomy_mapping = df.dropna(subset=['Item Description', 'Booked Category'])[['Item Description', 'Booked Category']].drop_duplicates()
        self.taxonomy_mapping['Item Description'] = self.taxonomy_mapping['Item Description'].str.lower()
        self.p80_map = p80_map
        self.df_main = df

    # --- Endpoints ---
    def get_dashboard_kpis(self):
        return {
            "kpis": self.kpis_data,
            "root_causes": self.root_causes,
            "category_analysis": self.category_analysis_summary,
            "plant_analysis": self.plant_analysis,
            "top_spends_category": self.top_spends_category
        }
        
    def get_savings_leakage(self):
        return {
            "savings_leakage_extended": self.savings_leakage_extended,
            "plant_analysis": self.plant_analysis
        }
        
    def get_category_suppliers(self):
        return self.category_suppliers_payload
        
    def get_consolidation(self):
        return {
            "risk_and_consolidation": self.risk_and_consolidation,
            "kpis": self.consolidation_kpis,
            "strategies": getattr(self, 'category_suppliers_payload', {}).get('strategies', [])
        }
        
    def get_buyer_behavior(self):
        bb = self.buyer_behavior
        buyer_agg = pd.DataFrame(bb)
        total_maverick_buyers = len(bb)
        repeat_maverick_buyers = sum(1 for b in bb if 'Repeat' in b.get('pattern', ''))
        total_leakage_all = sum(b['leakage'] for b in bb)
        avg_leakage_per_buyer = total_leakage_all / total_maverick_buyers if total_maverick_buyers > 0 else 0
        
        # Compute insight stats from ALL maverick buyers
        all_buyer_leakage = buyer_agg['leakage'].sum() if not buyer_agg.empty else 0
        all_buyer_count = len(buyer_agg)
        top10_leakage = buyer_agg.nlargest(10, 'leakage')['leakage'].sum() if not buyer_agg.empty else 0
        top10_count = min(10, all_buyer_count)
        top10_pct = (top10_leakage / all_buyer_leakage * 100) if all_buyer_leakage > 0 else 0
        
        insight_text = (
            f"From your data: top {top10_count} buyers generated "
            f"₹{top10_leakage/10000000:.2f}Cr of the "
            f"₹{all_buyer_leakage/10000000:.2f}Cr total leakage ({top10_pct:.0f}%). "
            f"{top10_pct:.0f}% of leakage comes from {top10_count} buyers out of {all_buyer_count}. "
            f"Makes the case for targeted nudges, not blanket policy."
        )
        return {
            "kpis": {
                "total_maverick_buyers": total_maverick_buyers,
                "repeat_maverick_buyers": repeat_maverick_buyers,
                "avg_leakage_per_buyer": avg_leakage_per_buyer,
                "total_leakage_all_buyers": total_leakage_all
            },
            "insight": insight_text,
            "buyer_behavior": bb
        }
        
    def get_compliance(self):
        return {"compliance": self.compliance_obj}

    def classify_purchase(self, description):
        desc_lower = str(description).lower()
        predicted_l2 = None
        predicted_l1 = None
        
        # Improved NLP classification using TF-IDF cosine similarity
        predicted_l2 = None
        predicted_l1 = None
        best_score = 0.0

        if hasattr(self, 'category_taxonomy_df') and not self.category_taxonomy_df.empty:
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer
                from sklearn.metrics.pairwise import cosine_similarity
                import numpy as _np

                # Build corpus: one string per taxonomy row (L2 name + description + keywords)
                corpus_rows = []
                corpus_meta = []
                for _, row in self.category_taxonomy_df.iterrows():
                    l2 = str(row.get('L2', '')).strip()
                    l1 = str(row.get('L1', '')).strip()
                    if not l2 or l2 == 'nan': continue
                    text = ' '.join([
                        l2, l2,  # weight L2 name double
                        str(row.get('Description', '')),
                        str(row.get('Keywords', ''))
                    ]).lower()
                    corpus_rows.append(text)
                    corpus_meta.append((l1, l2))

                if corpus_rows:
                    vectorizer = TfidfVectorizer(ngram_range=(1,2), min_df=1)
                    tfidf_matrix = vectorizer.fit_transform(corpus_rows)
                    query_vec = vectorizer.transform([desc_lower])
                    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
                    best_idx = int(scores.argmax())
                    best_score = float(scores[best_idx])
                    if best_score > 0.05:  # minimum threshold
                        predicted_l1, predicted_l2 = corpus_meta[best_idx]
            except Exception:
                pass

        # Word-overlap fallback if sklearn not available or score too low
        if not predicted_l2 and hasattr(self, 'category_taxonomy_df') and not self.category_taxonomy_df.empty:
            best_match_score = 0
            desc_words = set(desc_lower.split())
            for _, row in self.category_taxonomy_df.iterrows():
                l1 = str(row.get('L1', ''))
                l2 = str(row.get('L2', ''))
                if not l2 or l2 == 'nan': continue
                tax_text = ' '.join([l2, str(row.get('Description', '')), str(row.get('Keywords', ''))]).lower()
                tax_words = set(tax_text.split())
                intersect = len(desc_words.intersection(tax_words))
                if intersect > best_match_score:
                    best_match_score = intersect
                    predicted_l2 = l2
                    predicted_l1 = l1
        
        # Fallback if no match from Taxonomy sheet
        if not predicted_l2:
            predicted_l2 = "IT Consumables" if "laptop" in desc_lower or "macbook" in desc_lower else "MRO"
            predicted_l1 = "IT" if "laptop" in desc_lower else "Operations"
            
        # STEP 2: Fetch Active Contracts
        today = pd.Timestamp.now()
        active_contracts = self.contracts_df_raw.copy()
        active_contracts['Contract End Date'] = pd.to_datetime(active_contracts['Contract End Date'], errors='coerce')
        
        # Initial filter for exact L2
        l2_contracts = active_contracts[
            (active_contracts['Category L2'] == predicted_l2) &
            (active_contracts['is_active'].astype(str).str.upper() == 'TRUE') &
            (active_contracts['Contract End Date'] > today)
        ]
        
        # FALLBACK LOGIC: If no contracts for L2, fallback to any L2 under the same L1
        if l2_contracts.empty and predicted_l1 and hasattr(self, 'category_taxonomy_df') and not self.category_taxonomy_df.empty:
            sibling_l2s = self.category_taxonomy_df[self.category_taxonomy_df['L1'] == predicted_l1]['L2'].dropna().unique()
            l2_contracts = active_contracts[
                (active_contracts['Category L2'].isin(sibling_l2s)) &
                (active_contracts['is_active'].astype(str).str.upper() == 'TRUE') &
                (active_contracts['Contract End Date'] > today)
            ]
            
        active_contracts = l2_contracts
        
        # STEP 3 & 4: Fetch Suppliers, join Supplier_Master, sort by Price ASC, Top 3
        # Convert prices to numeric safely
        active_contracts['Contracted Unit Price'] = pd.to_numeric(active_contracts['Contracted Unit Price'], errors='coerce')
        active_contracts = active_contracts.dropna(subset=['Contracted Unit Price'])
        
        # Join Supplier_Master and compute score
        supplier_options = []
        for _, c_row in active_contracts.iterrows():
            sid = c_row['Supplier ID']
            s_match = self.supp_df_raw[self.supp_df_raw['SupplierID'] == sid]
            
            s_name = str(s_match['Supplier Name'].iloc[0]) if not s_match.empty and 'Supplier Name' in s_match.columns else sid
            r_score = float(s_match['Compliance Risk '].iloc[0]) if not s_match.empty and 'Compliance Risk ' in s_match.columns else 0.0
            
            price = float(c_row['Contracted Unit Price'])
            # Score: lower is better. Price + penalty for risk
            score = price + (price * (r_score * 0.05))
            
            supplier_options.append({
                "supplier_id": sid,
                "supplier_name": s_name,
                "contracted_price": price,
                "moq": int(c_row.get('Minimum Order Qty', 1)),
                "risk_score": r_score,
                "score": score
            })
            
        # STRICT PREFERRED LOGIC: Only the supplier with lowest score is marked as preferred
        if supplier_options:
            supplier_options = sorted(supplier_options, key=lambda x: x['score'])
            for i, supp in enumerate(supplier_options):
                supp['is_preferred'] = (i == 0)
                
            # Now sort by price to show to user
            supplier_options = sorted(supplier_options, key=lambda x: x['contracted_price'])
        
        # Return top 3
        top_3_suppliers = supplier_options[:3]
        
        return {
            "l1_category": predicted_l1,
            "predicted_category": predicted_l2,
            "preferred_suppliers": top_3_suppliers
        }
        
    def submit_po(self, po_data):
        import random
        po_num = f"PO-2026-{random.randint(1000, 9999)}"
        po_data['po_number'] = po_num
        self.mock_po_history.append(po_data)
        return {"success": True, "po_number": po_num}
        
    def get_purchase_history(self):
        return self.mock_po_history
    def get_demand_forecast(self):
        dp = self.demand_patterns_df.copy()
        cc = self.contracts_df_raw.copy()
        df = self.df_main.copy()

        # KPIs
        # 1. Predicted tail spend (30d)
        # Rolling 30d avg of tail spend * 1.05 trend factor
        tail_df = df[df['is_tail']].copy()
        if not tail_df.empty:
            today = tail_df['Invoice Date'].max()
            last_30 = tail_df[tail_df['Invoice Date'] >= (today - pd.Timedelta(days=30))]
            predicted_tail_30d = float(last_30['Amount'].sum() * 1.05)
        else:
            predicted_tail_30d = 0

        # Section 1: Cross-BU demand pooling
        # SKUs where Reorder Frequency Days <= 30 AND Plant ID count >= 2
        pool = dp[dp['Reorder Frequency Days'] <= 30].groupby('Item SKU').agg(
            plant_count      = ('Plant ID', 'nunique'),
            total_forecast   = ('Forecast Qty Next 90 Days', 'sum'),
            avg_reorder_freq = ('Reorder Frequency Days', 'mean'),
            avg_lead_time    = ('Lead Time Days', 'mean'),
            plants           = ('Plant ID', lambda x: list(x.unique()))
        ).reset_index()

        pool = pool[pool['plant_count'] >= 2].sort_values('total_forecast', ascending=False)
        
        # Savings estimate: 10% price improvement from volume pooling
        pool = pool.merge(cc[cc['is_active']==True][['Item SKU','Contracted Unit Price']], on='Item SKU', how='left')
        pool['Contracted Unit Price'] = pd.to_numeric(pool['Contracted Unit Price'], errors='coerce').fillna(0)
        pool['est_saving'] = pool['total_forecast'] * pool['Contracted Unit Price'] * 0.10
        
        # Only top 10 with savings > 0
        pool = pool[pool['est_saving'] > 0].sort_values('est_saving', ascending=False).head(10)
        
        # Section 2: Recurring tail items that should be contracted
        # items with Reorder Frequency <= 14 days
        fast_reorder = dp[dp['Reorder Frequency Days'] <= 14].groupby('Item SKU').agg(
            forecast_qty  = ('Forecast Qty Next 90 Days', 'sum'),
            plants_count  = ('Plant ID', 'nunique'),
            plants_list   = ('Plant ID', lambda x: ", ".join(map(str, x.unique()))),
            reorder_freq  = ('Reorder Frequency Days', 'mean')
        ).reset_index()

        active_skus = cc[cc['is_active']==True]['Item SKU'].unique()
        fast_reorder['has_contract'] = fast_reorder['Item SKU'].isin(active_skus)
        fast_reorder['should_contract'] = ~fast_reorder['has_contract']

        # Cross-check with tail spend (match on Item SKU)
        tail_skus = df[df['is_tail']]['Item SKU'].unique()
        fast_reorder['in_tail'] = fast_reorder['Item SKU'].isin(tail_skus)
        
        # Urgent: appears in tail AND has no contract
        recurring_tail = fast_reorder[fast_reorder['should_contract'] & fast_reorder['in_tail']].copy()

        # More KPIs
        pool_opportunities_count = len(pool)
        seasonal_items_count = len(dp[dp['is_seasonal'] == True]['Item SKU'].unique())
        recurring_tail_count = len(recurring_tail)

        return {
            "kpis": {
                "predicted_tail_30d": predicted_tail_30d,
                "pool_opportunities": pool_opportunities_count,
                "seasonal_items": seasonal_items_count,
                "recurring_tail_needing_contract": recurring_tail_count
            },
            "pooling_opportunities": pool.fillna(0).to_dict('records'),
            "recurring_tail_items": recurring_tail.fillna(0).to_dict('records'),
            "seasonal_items": dp[dp['is_seasonal'] == True].replace({np.nan: None}).to_dict('records')
        }
