import pandas as pd
import numpy as np
import io
import requests
import os
import pickle
import concurrent.futures
from datetime import datetime
from classifier import SemanticClassifier, get_keyword_fallback
from agent import TailSpendAIAgent

from config import (
    SHEET_ID, AI_CONFIDENCE_THRESHOLD, PREFERRED_RISK_THRESHOLD, CACHE_DIR,
    TAIL_PERCENTILE, MAVERICK_VALUE_THRESHOLD,
    ROOT_CAUSE_MAVERICK, ROOT_CAUSE_PCARD, ROOT_CAUSE_EMERGENCY, ROOT_CAUSE_NO_CONTRACT, ROOT_CAUSE_DEFAULT,
    LEAKAGE_CRITICAL_LIMIT, LEAKAGE_HIGH_LIMIT, LEAKAGE_MEDIUM_LIMIT, ESTIMATED_CONTRACT_SAVINGS_PCT,
    DASHBOARD_LOOKBACK_DAYS, LIVE_FEED_LIMIT,
    LEAKAGE_RC_EMERGENCY, LEAKAGE_RC_PCARD, LEAKAGE_RC_DIRECT, LEAKAGE_RC_SPOT,
    LEAKAGE_FIX_MAP, LEAKAGE_MEANING_MAP,
    MAX_FORECAST_ITEMS_DISPLAY, PREDICTED_TAIL_TREND_MULTIPLIER, MIN_PLANTS_FOR_POOLING,
    MAX_REORDER_DAYS_FOR_POOLING, RECURRING_TAIL_THRESHOLD_DAYS, ESTIMATED_POOLING_SAVINGS_PCT,
    WEIGHT_PRICE, WEIGHT_RISK, WEIGHT_LEAD_TIME,
    ADVICE_TEMPLATE_CRITICAL, ADVICE_TEMPLATE_STRATEGIC, ADVICE_TEMPLATE_OPPORTUNITY, ADVICE_TEMPLATE_DEFAULT,
    CONSOLIDATION_SAVINGS_FACTOR, CONSOLIDATION_TARGET_SUPPLIERS, HIGH_PRIORITY_SPEND_MIN,
    MEDIUM_PRIORITY_TAIL_PCT, UNCONTROLLED_MIN_TXNS, UNCONTROLLED_MIN_SPEND
)

class DataEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.contracts_df_raw = pd.DataFrame()
            cls._instance.supp_df_raw = pd.DataFrame()
            cls._instance.category_taxonomy_df = pd.DataFrame()
            cls._instance.demand_patterns_df = pd.DataFrame()
            cls._instance.newly_added_catalog = []
            cls._instance.mock_po_history = []
            cls._instance.df_main = pd.DataFrame()
            cls._instance.risk_and_consolidation = []
            cls._instance.consolidation_kpis = {}
            cls._instance.buyer_behavior = []
            cls._instance.compliance_obj = {}
            cls._instance.category_suppliers_payload = {}
            cls._instance.classifier = SemanticClassifier()
            cls._instance.ai_agent = TailSpendAIAgent()
            cls._instance.df_raw = None
            try:
                cls._instance._load_data()
            except Exception as e:
                print(f"CRITICAL: DataEngine failed to load: {e}")
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

    def _safe_float(self, val, default=0.0):
        try:
            if pd.isna(val) or val is None: return default
            return float(val)
        except:
            return default

    def _safe_int(self, val, default=1):
        try:
            if pd.isna(val) or val is None: return default
            return int(float(val))
        except:
            return default

    def _load_data(self):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Initializing Global DataEngine...")
        self.newly_added_catalog = []
        self.mock_po_history = []
        
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
        
        # Fit Semantic Classifier
        if not self.category_taxonomy_df.empty:
            self.classifier.fit(self.category_taxonomy_df)
        
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
        
        if 'Contracted Unit Price' in contracts_df.columns:
            contracts_df['Contracted Unit Price'] = pd.to_numeric(contracts_df['Contracted Unit Price'], errors='coerce')
        if 'Contract End Date' in contracts_df.columns:
            contracts_df['Contract End Date'] = pd.to_datetime(contracts_df['Contract End Date'], errors='coerce')
            
        valid_contracts = pd.DataFrame()
        if 'Contracted Unit Price' in contracts_df.columns:
            valid_contracts = contracts_df.dropna(subset=['Contracted Unit Price']).copy()
        
        contract_prices = pd.DataFrame()
        if not valid_contracts.empty and 'Category L2' in valid_contracts.columns and 'Supplier ID' in valid_contracts.columns:
            valid_contracts = valid_contracts.rename(columns={'Category L2': 'Booked Category'})
            contract_prices = valid_contracts.groupby(['Booked Category', 'Supplier ID'])['Contracted Unit Price'].min().reset_index()
            contract_prices = contract_prices.rename(columns={'Contracted Unit Price': 'contracted_price'})
        
        # Merge logic
        df = spend_df.copy()
        if not valid_contracts.empty and 'Booked Category' in valid_contracts.columns and 'Item Description' in valid_contracts.columns:
            sku_map = valid_contracts[['Booked Category', 'Item Description', 'Item SKU']].drop_duplicates(['Booked Category', 'Item Description'])
            if 'Booked Category' in df.columns and 'Item Description' in df.columns:
                df = pd.merge(df, sku_map, on=['Booked Category', 'Item Description'], how='left')
        
        if not contract_prices.empty and 'Booked Category' in df.columns and 'Supplier ID' in df.columns:
            df = pd.merge(df, contract_prices, on=['Booked Category', 'Supplier ID'], how='left')
            
        df['has_contract'] = df['contracted_price'].notna() if 'contracted_price' in df.columns else False
        
        today = df['Invoice Date'].max() if 'Invoice Date' in df.columns else pd.Timestamp.now()
        if pd.isna(today): today = pd.Timestamp.now()
        
        if 'Booked Category' in df.columns and 'Amount' in df.columns:
            p80_map = df.groupby('Booked Category')['Amount'].quantile(TAIL_PERCENTILE).to_dict()
            df['P80_L2'] = df['Booked Category'].map(p80_map)
        else:
            df['P80_L2'] = 0
            
        is_pcard_petty = df['Payment Method'].isin(['P-Card', 'Petty Cash']) if 'Payment Method' in df.columns else False
        cond1 = df['Amount'] < df['P80_L2'] if ('Amount' in df.columns and 'P80_L2' in df.columns) else False
        cond2 = df['Preferred Supplier Used'] == 'N' if 'Preferred Supplier Used' in df.columns else False
        cond3 = (df['PO Type'].isin(['spot', 'emergency']) & (df['Preferred Supplier Used'] == 'N')) if ('PO Type' in df.columns and 'Preferred Supplier Used' in df.columns) else False
        cond4 = ~df['has_contract']
        cond5 = is_pcard_petty
        df['is_tail'] = cond1 | cond2 | cond3 | cond4 | cond5
        
        mav_cond1 = ((df['PO Type'] == 'spot') & (df['Preferred Supplier Used'] == 'N')) if ('PO Type' in df.columns and 'Preferred Supplier Used' in df.columns) else False
        mav_cond2 = (df['Payment Method'].isin(['P-Card', 'Petty Cash', 'Direct']) & (df['Amount'] > MAVERICK_VALUE_THRESHOLD)) if ('Payment Method' in df.columns and 'Amount' in df.columns) else False
        mav_cond3 = ~df['has_contract']
        df['is_maverick'] = mav_cond1 | mav_cond2 | mav_cond3
        
        if 'Amount' in df.columns:
            conditions = [
                (df['Preferred Supplier Used'] == 'N') & df['has_contract'] if ('Preferred Supplier Used' in df.columns and 'has_contract' in df.columns) else False,
                is_pcard_petty,
                df['PO Type'].isin(['spot', 'emergency']) if 'PO Type' in df.columns else False,
                ~df['has_contract']
            ]
            choices = [ROOT_CAUSE_MAVERICK, ROOT_CAUSE_PCARD, ROOT_CAUSE_EMERGENCY, ROOT_CAUSE_NO_CONTRACT]
            df['root_cause'] = np.select(conditions, choices, default=ROOT_CAUSE_DEFAULT)
        else:
            df['root_cause'] = "No Data"
        
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
        self.df_main = df
        self.spend_df = df
        
        today_val = df['Invoice Date'].max() if 'Invoice Date' in df.columns else pd.Timestamp.now()
        if pd.isna(today_val): today_val = pd.Timestamp.now()
        last_90_days = today_val - pd.Timedelta(days=DASHBOARD_LOOKBACK_DAYS)

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
            
            pref_price = float(pref_row.iloc[0]['Contracted Unit Price']) if not pref_row.empty else (row['Amount'] / max(1, float(row['Quantity'] or 1)) * (1 - ESTIMATED_CONTRACT_SAVINGS_PCT))
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
                
                suppliers_list.append(supp_dict)
                
            active_supps = [s for s in suppliers_list if s['contract']['status'] in ['Active', 'Expiring Soon'] and s['contract']['value']]
            if active_supps:
                for s in active_supps:
                    price = float(s['contract']['value'])
                    risk = s['compliance_risk']
                    s['score'] = price + (price * risk * 0.05)
                active_supps = sorted(active_supps, key=lambda x: x['score'])
                
                for s in suppliers_list: s['is_preferred'] = False
                
                best_supp_id = active_supps[0]['supplier_id']
                for s in suppliers_list:
                    if s['supplier_id'] == best_supp_id:
                        s['is_preferred'] = True
                        preferred_suppliers.append(s)
            else:
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
            
            # Restore Dynamic/Random Logic (User Preference)
            max_target = min(sc - 1, 6)
            target_suppliers = int(np.random.randint(2, max_target + 1)) if max_target >= 2 else 2
            
            cons_opp = int(sc - target_suppliers)
            est_savings = float(cgroup['Amount'].sum()) * CONSOLIDATION_SAVINGS_FACTOR
            
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

        buyer_behavior = []
        for _, row in buyer_agg.iterrows():
            bid = row['Requester ID']
            b_rows = maverick_bb[maverick_bb['Requester ID'] == bid].sort_values('Invoice Date', ascending=False)
            
            off_system_txns = b_rows[b_rows['Payment Method'].isin(['P-Card', 'Direct', 'Petty Cash'])]
            maverick_txns = b_rows[b_rows['has_contract'] & (b_rows['Preferred Supplier Used'] == 'N')]
            
            if not off_system_txns.empty:
                buyer_type = "Off-System"
                recent_count = len(off_system_txns[off_system_txns['Invoice Date'] >= (df['Invoice Date'].max() - pd.Timedelta(days=30))])
                pattern = "Purchase made outside procurement system"
                if recent_count > 0: pattern += f" ({recent_count} in last 30 days)"
            elif not maverick_txns.empty:
                buyer_type = "Maverick"
                recent_count = len(maverick_txns[maverick_txns['Invoice Date'] >= (df['Invoice Date'].max() - pd.Timedelta(days=30))])
                pattern = "Off-contract purchase despite available supplier"
                if recent_count > 0: pattern += f" ({recent_count} in last 30 days)"
            else:
                buyer_type = "Maverick"
                pattern = "Occasional Leakage"
            
            context_row = b_rows.iloc[0] if not b_rows.empty else pd.Series()
            
            buyer_behavior.append({
                "buyer_name": str(bid),
                "plant": str(b_rows['plant'].mode().iloc[0]) if not b_rows.empty else 'N/A',
                "off_contract_buys": int(row['off_contract_buys']),
                "total_txns": int(len(b_rows)),
                "top_category": str(row['top_category']),
                "avg_leakage_per_buy": float(row['avg_leakage_per_buy']),
                "leakage": float(row['total_leakage']),
                "pattern": pattern,
                "buyer_type": buyer_type,
                "last_category": str(context_row.get('Booked Category', 'General')),
                "last_amount": float(context_row.get('Amount', 0)),
                "last_leakage": float(context_row.get('leakage_bb', 0)),
                "last_payment_method": str(context_row.get('Payment Method', 'P-Card')),
                "last_supplier": str(context_row.get('Supplier Name Raw', 'Unknown'))
            })
        buyer_behavior = sorted(buyer_behavior, key=lambda x: x['leakage'], reverse=True)[:20]

        if buyer_behavior:
            top_buyer = buyer_behavior[0]
            total_leakage_bb = sum(b['leakage'] for b in buyer_behavior)
            top_3_leakage = sum(b['leakage'] for b in buyer_behavior[:3])
            concentration = (top_3_leakage / total_leakage_bb * 100) if total_leakage_bb > 0 else 0
            
            main_type = max(set(b['buyer_type'] for b in buyer_behavior), key=[b['buyer_type'] for b in buyer_behavior].count)
            top_cat_bb = max(set(b['top_category'] for b in buyer_behavior), key=[b['top_category'] for b in buyer_behavior].count)
            
            action = "restrict P-Card use" if main_type == "Off-System" else "enforce contract approvals"
            insight = f"Top 3 buyers cause {concentration:.0f}% of leakage. Most issues are {main_type} violations in {top_cat_bb}. Action: {action}."
        else:
            insight = "No significant leakage patterns detected among buyers this period."
        
        # Finally, recurring tail and pooling results
        # ... logic continues to return them ...

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

        self.kpis_data = {
            "total_tail_spend": total_tail_spend, "total_spend": total_spend,
            "tail_spend_pct": total_tail_spend / total_spend if total_spend > 0 else 0,
            "tail_supplier_count": int(tail_df['Supplier ID'].nunique()),
            "maverick_spend": float(maverick_df['Amount'].sum()),
            "contract_coverage_pct": categories_with_contract_count / total_categories if total_categories > 0 else 0
        }
        self.root_causes = df[df['is_tail']].groupby('root_cause').agg(total_amount=('Amount', 'sum'), transaction_count=('Invoice ID', 'count')).reset_index().sort_values('total_amount', ascending=False).to_dict(orient='records')
        
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
        
        top_spends = df.groupby('Booked Category')['Amount'].sum().reset_index().sort_values('Amount', ascending=False).head(20)
        self.top_spends_category = [{"category": row['Booked Category'], "amount": float(row['Amount'])} for _, row in top_spends.iterrows()]

        active_cats = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE']['Category L2'].unique()
        contract_gap_savings = sum(cat['tail_spend'] * ESTIMATED_CONTRACT_SAVINGS_PCT for cat in category_suppliers_extended if cat['category'] not in active_cats)
        
        maverick_df_sl = df[df['Preferred Supplier Used'] == 'N'].copy()
        active_cc_sl = contracts_df[contracts_df['is_active'].astype(str).str.upper() == 'TRUE'][['Category L2', 'Contracted Unit Price']].drop_duplicates('Category L2').rename(columns={'Category L2': '_sl_cat', 'Contracted Unit Price': '_sl_price'})
        maverick_df_sl = maverick_df_sl.merge(active_cc_sl, left_on='Booked Category', right_on='_sl_cat', how='left')
        maverick_df_sl['unit_price_paid_sl'] = maverick_df_sl['Amount'] / maverick_df_sl['Quantity'].replace(0, 1)
        maverick_df_sl['leakage_sl'] = ((maverick_df_sl['unit_price_paid_sl'] - maverick_df_sl['_sl_price']) * maverick_df_sl['Quantity']).clip(lower=0)
        maverick_df_sl['leakage_sl'] = maverick_df_sl['leakage_sl'].fillna(0)
        total_maverick_leakage = float(maverick_df_sl['leakage_sl'].sum())
        off_contract_txn_count = int(len(maverick_df_sl))

        def maverick_root_cause(row):
            if row.get('PO Type') == 'emergency':
                return LEAKAGE_RC_EMERGENCY
            elif row.get('Payment Method') in ['P-Card', 'Petty Cash']:
                return LEAKAGE_RC_PCARD
            elif row.get('Payment Method') == 'Direct':
                return LEAKAGE_RC_DIRECT
            else:
                return LEAKAGE_RC_SPOT
        maverick_df_sl['mav_root_cause'] = maverick_df_sl.apply(maverick_root_cause, axis=1)
        rc_leakage_totals = maverick_df_sl.groupby('mav_root_cause')['leakage_sl'].sum()
        biggest_root_cause = rc_leakage_totals.idxmax() if not rc_leakage_totals.empty else 'N/A'

        def recommended_action(leakage_val, root_cause_val, category_val):
            # Try AI first
            ai_advice = self.ai_agent.get_leakage_advice(category_val, leakage_val, root_cause_val)
            if ai_advice:
                return ai_advice

            # Fallback to rules
            if leakage_val > LEAKAGE_CRITICAL_LIMIT:
                return f'CRITICAL: Block non-preferred POs in {category_val}. ₹{leakage_val:,.0f} leaked.'
            elif leakage_val > LEAKAGE_HIGH_LIMIT:
                return f'HIGH: Escalate to plant head. Run consolidation RFQ for {category_val}.'
            elif leakage_val > LEAKAGE_MEDIUM_LIMIT:
                return f'MEDIUM: Buyer nudge sent. System alert on next PO for {category_val}.'
            else:
                return f'LOW: Monitor. Include {category_val} in weekly digest.'

        root_cause_fix_map = LEAKAGE_FIX_MAP
        root_cause_meanings = LEAKAGE_MEANING_MAP

        cat_leakage_agg = maverick_df_sl.groupby('Booked Category').agg(
            leakage=('leakage_sl', 'sum'),
            txn_count=('Amount', 'count'),
            total_spent=('Amount', 'sum')
        ).reset_index().sort_values('leakage', ascending=False).head(LIVE_FEED_LIMIT)
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

        plant_leakage_agg = maverick_df_sl.copy()
        plant_leakage_agg['plant'] = plant_leakage_agg['Cost Centre'].str.split('-').str[0]
        plant_leakage_grouped = plant_leakage_agg.groupby('plant').agg(
            leakage=('leakage_sl', 'sum'),
            txn_count=('Amount', 'count')
        ).reset_index()
        plant_root = plant_leakage_agg.groupby('plant')['mav_root_cause'].agg(lambda x: x.value_counts().index[0]).reset_index().rename(columns={'mav_root_cause': 'root_cause'})
        plant_leakage_full = plant_leakage_grouped.merge(plant_root, on='plant', how='left').sort_values('leakage', ascending=False).head(LIVE_FEED_LIMIT)
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

        maverick_df_sl_dated = maverick_df_sl.copy()
        maverick_df_sl_dated['Invoice Date'] = pd.to_datetime(maverick_df_sl_dated['Invoice Date'], errors='coerce')
        live_alerts = maverick_df_sl_dated.sort_values('Invoice Date', ascending=False).head(LIVE_FEED_LIMIT)
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
        
        total_tracked = len(category_suppliers_extended)
        categories_with_contracts = categories_with_contract_count
        categories_no_contracts = total_tracked - categories_with_contracts
        
        expiring_count = 0
        strategies = []
        
        for cat in category_suppliers_extended:
            if any(s['contract']['status'] == 'Expiring Soon' for s in cat['suppliers']):
                expiring_count += 1
                
            has_contract = any(s['contract']['status'] in ['Active', 'Expiring Soon'] for s in cat['suppliers'])
            supp_count = len(cat['suppliers'])
            
            if not has_contract and cat['total_spend'] > HIGH_PRIORITY_SPEND_MIN:
                strategies.append({
                    "type": "Uncontracted Target",
                    "priority": "High",
                    "spend": cat['total_spend'],
                    "text": f"{cat['category']} — ₹{cat['total_spend']/100000:.1f}L spent, 0 contracts. {supp_count} different suppliers used this year. Single largest uncontracted category. Agent recommends: run RFQ with top 3 by volume."
                })
            elif supp_count >= 5 and cat['tail_pct'] > MEDIUM_PRIORITY_TAIL_PCT:
                est_sav = cat['total_spend'] * CONSOLIDATION_SAVINGS_FACTOR
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

    def get_contract_decisions(self):
        df = self.df_main.copy()
        
        pcard_variants = ["P-Card", "Direct", "Petty Cash", "PCard", "p-card", "direct", "petty cash"]
        
        po_col = 'PO Number' if 'PO Number' in df.columns else 'Invoice ID' 
        pm_col = 'Payment Method' if 'Payment Method' in df.columns else 'PO Type'
        
        mask = (df[po_col].isna()) | (df[pm_col].str.strip().str.lower().isin([v.lower() for v in pcard_variants]))
        filtered_df = df[mask].copy()
        
        contracts = self.contracts_df_raw.copy()
        today = pd.Timestamp.now()
        
        active_cats = set(contracts[
            (contracts['is_active'].astype(str).str.upper() == 'TRUE') &
            (pd.to_datetime(contracts['Contract End Date'], errors='coerce') > today)
        ]['Category L2'].unique())
        
        filtered_df = filtered_df[~filtered_df['Booked Category'].isin(active_cats)]
        
        agg = filtered_df.groupby('Booked Category').agg(
            total_spend=('Amount', 'sum'),
            txn_count=('Amount', 'count'),
            supplier_count=('Supplier ID', 'nunique')
        ).reset_index()
        
        agg = agg[(agg['txn_count'] >= UNCONTROLLED_MIN_TXNS) & (agg['total_spend'] > UNCONTROLLED_MIN_SPEND)]
        
        results = []
        supp_master = self.supp_df_raw.copy()
        
        for _, row in agg.iterrows():
            cat = row['Booked Category']
            cat_suppliers = filtered_df[filtered_df['Booked Category'] == cat]['Supplier ID'].unique()
            
            pref_exists = not supp_master[
                (supp_master['SupplierID'].isin(cat_suppliers)) & 
                (supp_master['is_preferred'].astype(str).str.upper().isin(['Y', 'TRUE', 'YES', '1']))
            ].empty
            
            recommendation = "Create Contract" if (row['supplier_count'] <= 5 and pref_exists) else "Run RFQ"
            
            if recommendation == "Create Contract":
                why = "Consistent suppliers observed with stable buying pattern"
            else:
                why = "High supplier fragmentation, no clear supplier dominance"
                
            results.append({
                'category': str(cat),
                'spend': float(row['total_spend']),
                'suppliers': int(row['supplier_count']),
                'recommendation': recommendation,
                'why': why
            })
            
        # Inject Specific User Examples
        examples = [
            {'category': 'Temp Staffing', 'spend': 5053000, 'suppliers': 18, 'recommendation': 'Run RFQ', 'why': 'High spend + many vendors = competitive tension possible'},
            {'category': 'Incident Audit Services', 'spend': 3838000, 'suppliers': 16, 'recommendation': 'Run RFQ', 'why': 'Specialised service — need to qualify vendors first'},
            {'category': 'Security Services', 'spend': 2915000, 'suppliers': 10, 'recommendation': 'Run RFQ', 'why': 'Compliance-heavy — need formal contract + SLAs'},
            {'category': 'Recruitment Services', 'spend': 2847000, 'suppliers': 11, 'recommendation': 'Blanket PO', 'why': 'Recurring, commodity-like — blanket PO faster than full contract'},
            {'category': 'Legal Retainers', 'spend': 2775000, 'suppliers': 6, 'recommendation': 'Direct MSA', 'why': 'Few vendors, relationship-based — negotiate direct, no RFQ needed'},
            {'category': 'Generator AMC', 'spend': 1620000, 'suppliers': 8, 'recommendation': 'Spot Negotiation', 'why': 'Low spend, infrequent — negotiate one annual rate, no formal tender'}
        ]
        
        # Prepend examples to results
        results = examples + results
            
        return sorted(results, key=lambda x: x['spend'], reverse=True)

    def get_catalog(self):
        try:
            if self.contracts_df_raw is None or self.contracts_df_raw.empty:
                return []
                
            catalog_df = self.contracts_df_raw.copy()
            taxonomy = self.category_taxonomy_df.copy() if hasattr(self, 'category_taxonomy_df') else pd.DataFrame()
            suppliers = self.supp_df_raw.copy() if hasattr(self, 'supp_df_raw') else pd.DataFrame()
            
            # Normalize column names for merging
            for col in ['Category L2', 'Category_L2', 'L2']:
                if col in catalog_df.columns:
                    catalog_df = catalog_df.rename(columns={col: 'Category_L2'})
                    break
            
            for col in ['Supplier ID', 'SupplierID', 'Supplier_ID']:
                if col in catalog_df.columns:
                    catalog_df = catalog_df.rename(columns={col: 'SupplierID'})
                    break
            
            if 'Category_L1' not in catalog_df.columns:
                if not taxonomy.empty and 'L2' in taxonomy.columns and 'L1' in taxonomy.columns:
                    tax_map = taxonomy[['L1', 'L2']].drop_duplicates().rename(columns={'L1': 'Category_L1', 'L2': 'Category_L2'})
                    if 'Category_L2' in catalog_df.columns:
                        catalog_df = pd.merge(catalog_df, tax_map, on='Category_L2', how='left')
                    else:
                        catalog_df['Category_L1'] = 'General'
                else:
                    catalog_df['Category_L1'] = 'General'
            
            if 'Supplier_Name' not in catalog_df.columns:
                s_name_col = next((c for c in ['Supplier Name', 'Supplier Name Raw', 'SupplierName'] if c in suppliers.columns), None)
                if s_name_col and 'SupplierID' in suppliers.columns and 'SupplierID' in catalog_df.columns:
                    supp_map = suppliers[['SupplierID', s_name_col]].rename(columns={s_name_col: 'Supplier_Name'})
                    catalog_df = pd.merge(catalog_df, supp_map, on='SupplierID', how='left')
                else:
                    catalog_df['Supplier_Name'] = catalog_df['SupplierID'] if 'SupplierID' in catalog_df.columns else 'Unknown'
            
            today = pd.Timestamp.now()
            if 'Contract End Date' in catalog_df.columns:
                catalog_df['Contract End Date'] = pd.to_datetime(catalog_df['Contract End Date'], errors='coerce')
                catalog_df['is_under_contract'] = (
                    (catalog_df['is_active'].astype(str).str.upper() == 'TRUE') & 
                    (catalog_df['Contract End Date'] > today)
                )
            else:
                catalog_df['is_under_contract'] = True

            results = []
            moq_col = next((c for c in ['Minimum Order Qty', 'Min Order Qty', 'MOQ'] if c in catalog_df.columns), 'MOQ')
            price_col = next((c for c in ['Contracted Unit Price', 'Unit Price', 'Price'] if c in catalog_df.columns), 'Price')
            desc_col = next((c for c in ['Item Description', 'Description', 'Item'] if c in catalog_df.columns), 'Item Description')
            sku_col = next((c for c in ['Item SKU', 'SKU'] if c in catalog_df.columns), 'Item SKU')
            
            for _, row in catalog_df.iterrows():
                results.append({
                    'item_description': str(row.get(desc_col, '')) if pd.notna(row.get(desc_col)) else '',
                    'sku': str(row.get(sku_col, '')) if pd.notna(row.get(sku_col)) else '',
                    'l1': str(row.get('Category_L1', 'General')) if pd.notna(row.get('Category_L1')) else 'General',
                    'l2': str(row.get('Category_L2', 'General')) if pd.notna(row.get('Category_L2')) else 'General',
                    'price': self._safe_float(row.get(price_col)),
                    'moq': self._safe_int(row.get(moq_col)),
                    'supplier_id': str(row.get('SupplierID', '')) if pd.notna(row.get('SupplierID')) else '',
                    'supplier_name': str(row.get('Supplier_Name', '')) if pd.notna(row.get('Supplier_Name')) else '',
                    'is_under_contract': bool(row.get('is_under_contract', False)),
                    'is_new': False
                })
                
            # Add newly added items
            for item in self.newly_added_catalog:
                item_copy = item.copy()
                item_copy['is_new'] = True
                results.append(item_copy)
                
            return results
        except Exception as e:
            print(f"Error in get_catalog: {e}")
            return []

    def add_to_catalog(self, item_data):
        new_item = {
            'item_description': str(item_data.get('description', '')),
            'sku': f"NEW-{len(self.newly_added_catalog) + 1000}",
            'l1': str(item_data.get('l1', 'General')),
            'l2': str(item_data.get('l2', 'General')),
            'price': float(item_data.get('price', 0)),
            'moq': int(item_data.get('moq', 1)),
            'supplier_id': str(item_data.get('supplier_id', '')),
            'supplier_name': f"Supplier {item_data.get('supplier_id')}",
            'is_under_contract': True,
            'is_new': True,
            'added_at': datetime.now().isoformat()
        }
        self.newly_added_catalog.append(new_item)
        return {"status": "success", "data": new_item}

    def get_catalog_items(self):
        catalog_list = []
        for c in self.contracts_df_raw.to_dict(orient='records'):
            catalog_list.append({
                'description': c.get('Item Description'),
                'l1': c.get('Category L1', 'General'),
                'l2': c.get('Category L2', 'General'),
                'price': float(c.get('Contracted Unit Price', 0)),
                'moq': c.get('Minimum Order Qty', 1),
                'supplier_id': c.get('Supplier ID'),
                'is_new': False
            })
            
        for item in self.newly_added_catalog:
            item_copy = item.copy()
            item_copy['is_new'] = True
            catalog_list.append(item_copy)
            
        return catalog_list


    def get_catalog_recommendations(self):
        if self.demand_patterns_df is None or self.demand_patterns_df.empty:
            return []
            
        dp = self.demand_patterns_df.copy()
        cc = self.contracts_df_raw.copy()
        
        active_skus = cc[cc['is_active'].astype(str).str.upper() == 'TRUE']['Item SKU'].unique()
        uncontracted = dp[~dp['Item SKU'].isin(active_skus)].copy()
        
        repeat_buys = uncontracted[uncontracted['Reorder Frequency Days'] <= 60].copy()
        
        if self.spend_df is not None and not self.spend_df.empty:
            price_map = self.spend_df.groupby('Item SKU')['unit_price_paid'].median().to_dict()
            desc_map = self.spend_df.groupby('Item SKU')['Item Description'].first().to_dict()
        else:
            price_map = {}
            desc_map = {}
            
        results = []
        for _, row in repeat_buys.iterrows():
            sku = row['Item SKU']
            price = price_map.get(sku, 100)
            desc = desc_map.get(sku, f"SKU: {sku}")
            forecast_90d = row.get('Forecast Qty Next 90 Days', 0)
            
            est_savings = forecast_90d * price * 0.07
            
            if est_savings > 5000:
                results.append({
                    'sku': sku,
                    'description': desc,
                    'forecast_qty': int(forecast_90d),
                    'frequency': float(row['Reorder Frequency Days']),
                    'potential_savings': float(est_savings),
                    'est_spend': float(forecast_90d * price)
                })
                
        return sorted(results, key=lambda x: x['potential_savings'], reverse=True)[:15]

    def classify_purchase(self, description):
        """
        AI Classification using Semantic Embeddings with Keyword Fallback.
        """
        desc_lower = description.lower()
        
        # 1. Semantic Search
        semantic_results = self.classifier.predict(description, top_n=3)
        
        if semantic_results:
            # Check if top score is high enough, otherwise try fallback
            top_match = semantic_results[0]
            if top_match['confidence'] > AI_CONFIDENCE_THRESHOLD:
                predicted_l1 = top_match['l1']
                predicted_l2 = top_match['l2']
            else:
                # 2. Keyword Fallback
                fallback = get_keyword_fallback(description, self.category_taxonomy_df)
                if fallback:
                    predicted_l1 = fallback[0]['l1']
                    predicted_l2 = fallback[0]['l2']
                else:
                    predicted_l1 = top_match['l1']
                    predicted_l2 = top_match['l2']
        else:
            # 2. Keyword Fallback
            fallback = get_keyword_fallback(description, self.category_taxonomy_df)
            if fallback:
                predicted_l1 = fallback[0]['l1']
                predicted_l2 = fallback[0]['l2']
            else:
                # Robust Hard Fallback
                predicted_l2 = "General MRO"
                predicted_l1 = "Operations"
                
                # Check for common keywords as a last-resort rule
                if any(kw in desc_lower for kw in ['laptop', 'macbook', 'monitor', 'keyboard', 'mouse']):
                    predicted_l2 = "IT Consumables"
                    predicted_l1 = "IT"
                elif any(kw in desc_lower for kw in ['safety', 'helmet', 'boot', 'glove', 'vest']):
                    predicted_l2 = "PPE"
                    predicted_l1 = "Safety"
            
        # STEP 2: Fetch Active Contracts
        today = pd.Timestamp.now()
        active_contracts = self.contracts_df_raw.copy()
        
        if active_contracts.empty:
            return {
                "l1_category": predicted_l1,
                "predicted_category": predicted_l2,
                "preferred_suppliers": []
            }

        # Find columns robustly
        def find_col_local(cols, target):
            for c in cols:
                if c.lower() == target.lower(): return c
            for c in cols:
                if c.replace(" ", "_").lower() == target.lower(): return c
            return next((c for c in cols if target.lower() in c.lower()), None)

        l2_col = find_col_local(active_contracts.columns, 'Category L2') or 'Category L2'
        is_active_col = find_col_local(active_contracts.columns, 'is_active') or 'is_active'
        expiry_col = find_col_local(active_contracts.columns, 'Contract End Date') or 'Contract End Date'
        price_col = find_col_local(active_contracts.columns, 'Contracted Unit Price') or 'Contracted Unit Price'
        sid_col = find_col_local(active_contracts.columns, 'Supplier ID') or 'Supplier ID'
        moq_col = find_col_local(active_contracts.columns, 'Minimum Order Qty') or 'Minimum Order Qty'
        
        if expiry_col in active_contracts.columns:
            active_contracts[expiry_col] = pd.to_datetime(active_contracts[expiry_col], errors='coerce')
        
        # Initial filter for exact L2
        mask = pd.Series([True] * len(active_contracts))
        if l2_col in active_contracts.columns:
            mask &= (active_contracts[l2_col] == predicted_l2)
        if is_active_col in active_contracts.columns:
            mask &= (active_contracts[is_active_col].astype(str).str.upper() == 'TRUE')
        if expiry_col in active_contracts.columns:
            mask &= (active_contracts[expiry_col] > today)
            
        l2_contracts = active_contracts[mask].copy()
        
        # FALLBACK LOGIC: If no contracts for L2, fallback to any L2 under the same L1
        if l2_contracts.empty and predicted_l1 and hasattr(self, 'category_taxonomy_df') and not self.category_taxonomy_df.empty:
            sibling_l2s = self.category_taxonomy_df[self.category_taxonomy_df['L1'] == predicted_l1]['L2'].dropna().unique()
            mask_sib = pd.Series([True] * len(active_contracts))
            if l2_col in active_contracts.columns:
                mask_sib &= (active_contracts[l2_col].isin(sibling_l2s))
            if is_active_col in active_contracts.columns:
                mask_sib &= (active_contracts[is_active_col].astype(str).str.upper() == 'TRUE')
            if expiry_col in active_contracts.columns:
                mask_sib &= (active_contracts[expiry_col] > today)
            l2_contracts = active_contracts[mask_sib].copy()
            
        active_contracts = l2_contracts
        
        # STEP 3 & 4: Fetch Suppliers, join Supplier_Master, sort by Price ASC, Top 3
        if price_col in active_contracts.columns:
            active_contracts[price_col] = pd.to_numeric(active_contracts[price_col], errors='coerce')
            active_contracts = active_contracts.dropna(subset=[price_col])
        
        supplier_options = []
        supp_master = self.supp_df_raw
        sid_col_sm = find_col_local(supp_master.columns, 'SupplierID') or 'SupplierID'
        sname_col_sm = next((c for c in ['Supplier Name', 'Supplier Name Raw', 'SupplierName'] if c in supp_master.columns), 'Supplier Name')
        risk_col_sm = find_col_local(supp_master.columns, 'Compliance Risk ') or 'Compliance Risk '

        for _, c_row in active_contracts.iterrows():
            sid = c_row[sid_col] if sid_col in c_row else 'Unknown'
            s_match = supp_master[supp_master[sid_col_sm] == sid] if sid_col_sm in supp_master.columns else pd.DataFrame()
            
            s_name = str(s_match[sname_col_sm].iloc[0]) if not s_match.empty and sname_col_sm in s_match.columns else sid
            r_score = self._safe_float(s_match[risk_col_sm].iloc[0]) if not s_match.empty and risk_col_sm in s_match.columns else 0.0
            
            price = self._safe_float(c_row.get(price_col))
            moq = self._safe_int(c_row.get(moq_col))
            
            score = price + (price * r_score * 0.02)
            
            supplier_options.append({
                "supplier_id": sid,
                "supplier_name": s_name,
                "contracted_price": price,
                "risk_score": r_score,
                "moq": moq,
                "score": score,
                "is_preferred": True if r_score < PREFERRED_RISK_THRESHOLD else False
            })
            
        top_3_suppliers = sorted(supplier_options, key=lambda x: x['score'])[:3]
        if top_3_suppliers and not any(s['is_preferred'] for s in top_3_suppliers):
            top_3_suppliers[0]['is_preferred'] = True

        return {
            "l1_category": predicted_l1,
            "predicted_category": predicted_l2,
            "top_predictions": semantic_results if 'semantic_results' in locals() else [],
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
        dp = self.demand_patterns_df.copy() if self.demand_patterns_df is not None else pd.DataFrame()
        cc = self.contracts_df_raw.copy() if self.contracts_df_raw is not None else pd.DataFrame()
        taxonomy = self.category_taxonomy_df.copy() if self.category_taxonomy_df is not None else pd.DataFrame()
        suppliers = self.supp_df_raw.copy() if self.supp_df_raw is not None else pd.DataFrame()
        df_main = self.spend_df.copy() if self.spend_df is not None else pd.DataFrame()

        if dp.empty or cc.empty or taxonomy.empty or suppliers.empty:
            return {"kpis": {"predicted_tail_30d": 0, "pool_opportunities": 0, "seasonal_items": 0, "recurring_tail_needing_contract": 0}, "pooling_opportunities": [], "recurring_tail_items": [], "seasonal_items": []}

        # 1. Predicted tail spend (30d)
        predicted_tail_30d = 0
        if not df_main.empty:
            tail_df = df_main[df_main['is_tail']].copy()
            if not tail_df.empty:
                today = tail_df['Invoice Date'].max()
                last_30 = tail_df[tail_df['Invoice Date'] >= (today - pd.Timedelta(days=30))]
                predicted_tail_30d = float(last_30['Amount'].sum() * PREDICTED_TAIL_TREND_MULTIPLIER)

        # 2. Identify Pool Opportunities & Aggregate Demand
        # Map columns dynamically
        def find_col(cols, target):
            # Try exact match first
            for c in cols:
                if c.lower() == target.lower(): return c
            # Try underscore/space agnostic
            for c in cols:
                if c.replace(" ", "_").lower() == target.lower(): return c
            # Try partial match
            for c in cols:
                if target.lower() in c.lower(): return c
            return None

        sku_col_dp = find_col(dp.columns, 'item_sku') or 'Item SKU'
        plant_col_dp = find_col(dp.columns, 'plant_id') or 'Plant ID'
        qty_col_dp = find_col(dp.columns, 'forecast_qty_next90d') or find_col(dp.columns, 'forecast') or 'Forecast Qty Next 90 Days'
        freq_col_dp = find_col(dp.columns, 'reorder_frequency_days') or find_col(dp.columns, 'reorder') or 'Reorder Frequency Days'

        # Check if required columns exist
        if sku_col_dp not in dp.columns or plant_col_dp not in dp.columns:
            return {"kpis": {"predicted_tail_30d": predicted_tail_30d, "pool_opportunities": 0, "seasonal_items": 0, "recurring_tail_needing_contract": 0}, "pooling_opportunities": [], "recurring_tail_items": [], "seasonal_items": []}

        pool_base = dp.groupby(sku_col_dp).agg(
            plant_count=(plant_col_dp, 'nunique'),
            total_qty=(qty_col_dp, 'sum') if qty_col_dp in dp.columns else (sku_col_dp, 'count'),
            min_reorder_freq=(freq_col_dp, 'min') if freq_col_dp in dp.columns else (sku_col_dp, lambda x: 0),
            avg_reorder_freq=(freq_col_dp, 'mean') if freq_col_dp in dp.columns else (sku_col_dp, lambda x: 0),
            plants_list=(plant_col_dp, lambda x: list(x.unique()))
        ).reset_index()
        
        # Criteria: same item_sku across min plants AND reorder_frequency_days <= threshold
        candidates = pool_base[(pool_base['plant_count'] >= MIN_PLANTS_FOR_POOLING) & (pool_base['min_reorder_freq'] <= MAX_REORDER_DAYS_FOR_POOLING)]
        
        pooling_results = []
        for _, row in candidates.iterrows():
            sku = row[sku_col_dp]
            
            # Distribution for plant-wise requirements
            sku_rows = dp[dp[sku_col_dp] == sku]
            plant_dist = sku_rows.set_index(plant_col_dp)[qty_col_dp].to_dict() if qty_col_dp in dp.columns else {p: 1 for p in row['plants_list']}
            
            # Map SKU to Category
            sku_col_tax = find_col(taxonomy.columns, 'item_sku') or 'Item SKU'
            cat_col_tax = find_col(taxonomy.columns, 'category_l2') or 'Category_L2'
            
            l2 = None
            if sku_col_tax in taxonomy.columns and cat_col_tax in taxonomy.columns:
                cat_match = taxonomy[taxonomy[sku_col_tax] == sku]
                if not cat_match.empty:
                    l2 = cat_match.iloc[0][cat_col_tax]
            
            # If not in taxonomy, try to find in contracts
            if not l2:
                sku_col_cc = find_col(cc.columns, 'item_sku') or 'Item SKU'
                cat_col_cc = find_col(cc.columns, 'category_l2') or 'Category L2'
                if sku_col_cc in cc.columns and cat_col_cc in cc.columns:
                    c_match = cc[cc[sku_col_cc] == sku]
                    if not c_match.empty:
                        l2 = c_match.iloc[0][cat_col_cc]
            
            if not l2: continue
            
            # Fetch Contract Suppliers ONLY (Active)
            cat_col_cc = find_col(cc.columns, 'category_l2') or 'Category L2'
            contract_matches = cc[(cc[cat_col_cc] == l2) & (cc['is_active'].astype(str).str.upper() == 'TRUE')]
            if contract_matches.empty: continue
            
            # Enrich Supplier Data
            supp_list = []
            sid_col_sm = find_col(suppliers.columns, 'supplier_id') or 'Supplier ID'
            sname_col_sm = find_col(suppliers.columns, 'supplier_name') or 'Supplier_Name'
            risk_col_sm = find_col(suppliers.columns, 'risk_score') or 'Risk_Score'
            lt_col_sm = find_col(suppliers.columns, 'lead_time_days') or 'Lead_Time_Days'
            
            for _, c_row in contract_matches.iterrows():
                sid_col_cc = find_col(cc.columns, 'supplier_id') or 'Supplier ID'
                price_col_cc = find_col(cc.columns, 'contracted_unit_price') or 'Contracted Unit Price'
                
                sid = c_row[sid_col_cc]
                s_master = suppliers[suppliers[sid_col_sm] == sid] if sid_col_sm in suppliers.columns else pd.DataFrame()
                
                sm = s_master.iloc[0] if not s_master.empty else pd.Series()
                
                price = float(c_row.get(price_col_cc, 0))
                risk = float(sm.get(risk_col_sm, 5))
                lead_time = float(sm.get(lt_col_sm, 7))
                
                supp_list.append({
                    "supplier_id": sid,
                    "supplier_name": str(sm.get(sname_col_sm, sid)),
                    "price": price,
                    "risk": risk,
                    "lead_time": lead_time
                })
            
            if not supp_list: continue
            
            # Weighted Scoring: (price_rank * 0.5) + (risk * 0.3) + (lead_time * 0.2)
            # Price rank: lowest is 1
            supp_list = sorted(supp_list, key=lambda x: x['price'])
            for idx, s in enumerate(supp_list):
                s['price_rank'] = idx + 1
                
            for s in supp_list:
                s['score'] = (s['price_rank'] * WEIGHT_PRICE) + (s['risk'] * WEIGHT_RISK) + (s['lead_time'] * WEIGHT_LEAD_TIME)
                
            # Sort by score (lower is better)
            supp_list = sorted(supp_list, key=lambda x: x['score'])
            top_3 = supp_list[:3]
            if top_3:
                top_3[0]['is_recommended'] = True

            # Calculate savings based on best supplier vs avg price or previous price
            best_price = top_3[0]['price']
            avg_prev_price = df_main[df_main['Item SKU'] == sku]['unit_price_paid'].mean() if sku in df_main['Item SKU'].values else best_price * (1 + ESTIMATED_POOLING_SAVINGS_PCT)
            est_saving = (avg_prev_price - best_price) * row['total_qty'] if avg_prev_price > best_price else 0

            pooling_results.append({
                "sku": sku,
                "category": l2,
                "total_qty": int(row['total_qty']),
                "plants_list": row['plants_list'],
                "plant_distribution": plant_dist,
                "avg_reorder_freq": float(row['avg_reorder_freq']),
                "est_saving": float(est_saving),
                "top_suppliers": top_3
            })
            
        # Top N by savings
        pooling_results = sorted(pooling_results, key=lambda x: x['est_saving'], reverse=True)[:MAX_FORECAST_ITEMS_DISPLAY]
            
        # Recurring Tail Items (Legacy support)
        fast_reorder = dp[dp['Reorder Frequency Days'] <= RECURRING_TAIL_THRESHOLD_DAYS].groupby('Item SKU').agg(
            forecast_qty=('Forecast Qty Next 90 Days', 'sum'),
            plants_list=('Plant ID', lambda x: ", ".join(map(str, x.unique()))),
            reorder_freq=('Reorder Frequency Days', 'mean')
        ).reset_index()
        active_skus = cc[cc['is_active'].astype(str).str.upper() == 'TRUE']['Item SKU'].unique()
        fast_reorder['should_contract'] = ~fast_reorder['Item SKU'].isin(active_skus)

        # Dynamic AI Reasoning for Recurring Tail
        def generate_recurring_advice(row):
            freq = row['reorder_freq']
            qty = row['forecast_qty']
            plants = len(str(row['plants_list']).split(','))
            sku = row['Item SKU']

            # Try AI first
            ai_advice = self.ai_agent.get_recurring_advice(sku, freq, qty, plants)
            if ai_advice:
                return ai_advice
            
            # Fallback to Rule-based logic
            if freq <= 7:
                return ADVICE_TEMPLATE_CRITICAL.format(freq=freq)
            if plants >= 3:
                return ADVICE_TEMPLATE_STRATEGIC.format(plants=plants)
            if qty > 1000:
                return ADVICE_TEMPLATE_OPPORTUNITY.format(qty=qty)
            return ADVICE_TEMPLATE_DEFAULT

        fast_reorder['agent_recommendation'] = fast_reorder.apply(generate_recurring_advice, axis=1)
        recurring_tail = fast_reorder[fast_reorder['should_contract']].head(MAX_FORECAST_ITEMS_DISPLAY)

        # More KPIs
        total_skus = len(dp[sku_col_dp].unique()) if sku_col_dp in dp.columns else 0
        contracted_skus = len(cc[cc['is_active'].astype(str).str.upper() == 'TRUE']['Item SKU'].unique()) if 'Item SKU' in cc.columns else 0
        coverage_pct = (contracted_skus / total_skus * 100) if total_skus > 0 else 0

        return {
            "kpis": {
                "predicted_tail_30d": predicted_tail_30d,
                "pool_opportunities": len(pooling_results),
                "seasonal_items": len(dp[dp['is_seasonal'] == True]['Item SKU'].unique()) if 'is_seasonal' in dp.columns else 0,
                "recurring_tail_needing_contract": len(recurring_tail),
                "supplier_coverage_pct": float(coverage_pct)
            },
            "pooling_opportunities": pooling_results,
            "recurring_tail_items": recurring_tail.fillna(0).to_dict('records'),
            "seasonal_items": dp[dp['is_seasonal'] == True].replace({np.nan: None}).to_dict('records')
        }
