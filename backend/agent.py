from groq import Groq
from config import GROQ_API_KEY, ENABLE_AI_ADVICE
import logging

# Configure Logging
logger = logging.getLogger(__name__)

class TailSpendAIAgent:
    def __init__(self):
        self.enabled = False
        if not ENABLE_AI_ADVICE:
            return

        if GROQ_API_KEY:
            try:
                # Using the lightning-fast Groq Llama 3 engine
                self.client = Groq(api_key=GROQ_API_KEY)
                self.model_name = "llama-3.3-70b-versatile"
                self.enabled = True
                logger.info(f"Groq Llama 3 Agent ({self.model_name}) enabled.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq AI: {e}")
        
        self.advice_cache = {}

    def _call_ai(self, prompt):
        """Standard caller for Groq Llama 3."""
        if not self.enabled:
            return None
            
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model_name,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            return None

    def get_recurring_advice(self, item_sku, freq, qty, plants):
        """
        Generate contextual advice for a recurring tail item.
        """
        cache_key = f"rec_{item_sku}_{freq}_{qty}_{plants}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Analyze this procurement demand pattern and give a one-sentence "Agent Recommendation" for a procurement manager.
        Item SKU: {item_sku}
        Reorder Frequency: Every {freq:.1f} days
        Forecasted Qty (90d): {qty:,.0f} units
        Number of Plants buying this: {plants}

        Rules:
        1. Be concise (max 20 words).
        2. Use a professional, strategic tone.
        3. Suggest a specific procurement action (e.g., cataloging, blanket PO, RFQ).
        
        Output only the recommendation string.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

    def get_leakage_advice(self, category, leakage_val, root_cause):
        """
        Generate contextual advice for a savings leakage category.
        """
        cache_key = f"leak_{category}_{leakage_val}_{root_cause}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Analyze this savings leakage and suggest a specific corrective action.
        Category: {category}
        Leakage Amount: ₹{leakage_val:,.0f}
        Root Cause: {root_cause}

        Suggest a one-sentence "Manager Action" to stop this leakage. Be firm and tactical.
        Output only the string.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

    def get_buyer_behaviour_advice(self, top_maverick_name, leakage_amt, txn_count):
        """
        Generate advice for buyer behaviour based on maverick spend.
        """
        cache_key = f"buyer_{top_maverick_name}_{leakage_amt}_{txn_count}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Analyze this buyer behaviour and provide a one-sentence "Insight":
        Top Maverick Buyer: {top_maverick_name}
        Leakage caused: ₹{leakage_amt:,.0f}
        Total off-contract transactions: {txn_count}

        Identify if this is a training issue, a system bypass, or an emergency need.
        Output only the insight.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

    def get_consolidation_advice(self, category, supplier_count, uncontrolled_spend):
        """
        Generate strategic consolidation advice.
        """
        cache_key = f"cons_{category}_{supplier_count}_{uncontrolled_spend}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Provide a strategic 1-2 line recommendation for consolidating this category:
        Category: {category}
        Current Suppliers: {supplier_count}
        Uncontrolled Spend: ₹{uncontrolled_spend:,.0f}

        Suggest how many suppliers to keep and what negotiation leverage we have.
        Output only the recommendation.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

    def get_contract_decision_advice(self, category, spend, supplier_count, rec_type):
        """
        Generate strategic 'Why' for a contract decision.
        """
        cache_key = f"dec_{category}_{spend}_{supplier_count}_{rec_type}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Provide a strategic 1-sentence "Why" for this procurement recommendation:
        Category: {category}
        Annual Spend: ₹{spend:,.0f}
        Current Suppliers: {supplier_count}
        Recommended Action: {rec_type}

        Focus on competition, risk, or volume aggregation.
        Output only the sentence.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

    def get_buyer_pattern_analysis(self, buyer_type, pattern_summary):
        """
        Analyze a specific buyer pattern and provide a tactical fix.
        """
        cache_key = f"bpat_{buyer_type}_{pattern_summary}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        Provide a 1-sentence tactical "Action" for this buyer behavior pattern:
        Bucket: {buyer_type}
        Behavior: {pattern_summary}

        Be specific (e.g., 'Redirect to training', 'Block P-Card', 'Review emergency policy').
        Output only the sentence.
        """

        advice = self._call_ai(prompt)
        if advice:
            self.advice_cache[cache_key] = advice
        return advice

# ADK definition for Specialized Agents

class LlmAgent:
    def __init__(self, name, description, tools, model):
        self.name = name
        self.description = description
        self.tools = tools
        self.model = model

def classify_category(item_description: str) -> dict:
    """Uses Category_Taxonomy keywords column to map to L2 category"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    result = engine.classify_purchase(item_description)
    return {
        "l1_category": result["l1_category"],
        "l2_category": result["predicted_category"]
    }

def check_contract(category_l2: str, plant_id: str) -> dict:
    """Queries active Contracts_Catalogue, returns preferred supplier + price"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    result = engine.classify_purchase(category_l2)
    suppliers = result["preferred_suppliers"]
    preferred = [s for s in suppliers if s["is_preferred"]]
    if preferred:
        return preferred[0]
    return suppliers[0] if suppliers else {}

def check_preferred_supplier(category_l2: str) -> list:
    """Returns is_preferred suppliers from Supplier_Master"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    result = engine.classify_purchase(category_l2)
    return [s for s in result["preferred_suppliers"] if s["is_preferred"]]

def create_po(supplier_id: str, category: str, amount: float, requester_id: str) -> dict:
    """Writes to Spend_Transactions"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    po_data = {
        "description": "Auto-generated by Llama Agent",
        "quantity": 1,
        "category": category,
        "supplier_id": supplier_id,
        "supplier_name": "Llama Agent Submitter",
        "amount": amount,
        "status": "Pending Approval",
        "timestamp": "2026-05-04T00:00:00Z",
        "requester_id": requester_id
    }
    return engine.submit_po(po_data)

def calculate_leakage_realtime(actual_amount: float, quantity: int, category_l2: str) -> float:
    """Fetches contracted price, computes delta"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    result = engine.classify_purchase(category_l2)
    suppliers = result["preferred_suppliers"]
    if not suppliers: return 0.0
    best_price = min([s["contracted_price"] for s in suppliers])
    leakage = (actual_amount / quantity) - best_price
    return max(leakage * quantity, 0.0)

def auto_classify_pcard(merchant_name: str, mcc_code: str) -> dict:
    """Maps to taxonomy using NLP"""
    query = f"{merchant_name} {mcc_code}"
    return classify_category(query)

# --- Agent Instances (All switched to Llama 3) ---

intake_agent = LlmAgent(
    name="IntakeClassificationAgent",
    description="Handles purchase requests and P-card feeds. Uses Llama 3 for tactical classification.",
    tools=[classify_category, check_contract, check_preferred_supplier, create_po, calculate_leakage_realtime, auto_classify_pcard],
    model="llama-3.3-70b-versatile",
)

def consolidation_analysis():
    from backend.data_processor import DataEngine
    return DataEngine().get_consolidation()

def dedup_vendor_master():
    from backend.data_processor import DataEngine
    df = DataEngine()._get_sheet_df('Supplier_Master')
    dupes = df[df.duplicated(subset=['Supplier Name'], keep=False)]
    return dupes.to_dict(orient='records')

def detect_dormant_suppliers():
    from backend.data_processor import DataEngine
    import pandas as pd
    from datetime import datetime, timedelta
    df = DataEngine()._get_sheet_df('Spend_Transactions')
    df['Invoice Date'] = pd.to_datetime(df['Invoice Date'])
    cutoff = datetime.now() - timedelta(days=365)
    recent_suppliers = df[df['Invoice Date'] >= cutoff]['Supplier ID'].unique()
    dormant = set(df['Supplier ID'].unique()) - set(recent_suppliers)
    return list(dormant)

def risk_score_suppliers():
    from backend.data_processor import DataEngine
    df = DataEngine()._get_sheet_df('Supplier_Master')
    df['Overall Risk Score'] = df['Geography Risk'] + df['Compliance Risk '] + df['Timely Delivery Risk']
    return df[df['Overall Risk Score'] > 15][['SupplierID', 'Supplier Name', 'Overall Risk Score']].to_dict(orient='records')

def detect_single_source():
    from backend.data_processor import DataEngine
    data = DataEngine().get_dashboard_kpis()
    return [c['category'] for c in data['category_analysis'] if c['supplier_count'] == 1]

def draft_rfq(category_l2: str, top_suppliers: list):
    suppliers_str = ", ".join(top_suppliers)
    return f"Subject: RFQ for {category_l2}\n\nRecommended target suppliers (Llama 3 Analysis): {suppliers_str}."

def contract_expiry_alerts():
    from backend.data_processor import DataEngine
    import pandas as pd
    df = DataEngine()._get_sheet_df('Contracts_Catalogue')
    df['Expiry Date'] = pd.to_datetime(df['Expiry Date'], errors='coerce')
    cutoff = pd.Timestamp.now() + pd.Timedelta(days=60)
    expiring = df[(df['Expiry Date'] <= cutoff) & (df['Expiry Date'] > pd.Timestamp.now())]
    return expiring[['Contract ID', 'Supplier Name', 'Category L2', 'Expiry Date']].to_dict(orient='records')

optimisation_agent = LlmAgent(
    name="SupplierOptimisationAgent",
    description="Consolidates supplier base and detects risk using Llama 3 intelligence.",
    tools=[consolidation_analysis, dedup_vendor_master, detect_dormant_suppliers, risk_score_suppliers, detect_single_source, draft_rfq, contract_expiry_alerts],
    model="llama-3.3-70b-versatile",
)

def fetch_db_data():
    from backend.data_processor import DataEngine
    return DataEngine().get_dashboard_kpis()

def fetch_leakage_data():
    from backend.data_processor import DataEngine
    return DataEngine().get_savings_leakage()

def fetch_compliance_data():
    from backend.data_processor import DataEngine
    return DataEngine().get_compliance()

def fetch_buyer_behaviour_data():
    from backend.data_processor import DataEngine
    return DataEngine().get_buyer_behavior()

insights_agent = LlmAgent(
    name="DashboardInsightsAgent",
    description="Fetches leakage and compliance data via Llama 3 queries.",
    tools=[fetch_db_data, fetch_leakage_data, fetch_compliance_data, fetch_buyer_behaviour_data],
    model="llama-3.3-70b-versatile",
)
