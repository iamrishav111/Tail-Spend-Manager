from google import genai
from config import GEMINI_API_KEY
import logging

# Configure Logging
logger = logging.getLogger(__name__)

class TailSpendAIAgent:
    def __init__(self):
        self.enabled = False
        if GEMINI_API_KEY:
            try:
                # Use the NEW google-genai client
                self.client = genai.Client(api_key=GEMINI_API_KEY)
                self.model_name = 'gemini-flash-latest'
                self.enabled = True
                logger.info("Modern Gemini AI Agent (google-genai) enabled.")
            except Exception as e:
                logger.error(f"Failed to initialize Modern Gemini AI: {e}")
        
        self.advice_cache = {}

    def get_recurring_advice(self, item_sku, freq, qty, plants):
        """
        Generate contextual advice for a recurring tail item.
        Uses cache to avoid redundant API calls and maintain low latency.
        """
        cache_key = f"rec_{item_sku}_{freq}_{qty}_{plants}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        if not self.enabled:
            return None

        prompt = f"""
        Analyze this procurement demand pattern and give a one-sentence "Agent Recommendation" for a procurement manager.
        Item SKU: {item_sku}
        Reorder Frequency: Every {freq:.1f} days
        Forecasted Qty (90d): {qty:,.0f} units
        Number of Plants buying this: {plants}

        Rules for recommendation:
        1. Be concise (max 20 words).
        2. Use a professional, strategic tone.
        3. If freq is low, emphasize velocity risk.
        4. If plants > 1, emphasize consolidation.
        5. Suggest a specific procurement action (e.g., cataloging, blanket PO, RFQ).
        
        Output only the recommendation string.
        """

        try:
            # New google-genai syntax
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            advice = response.text.strip()
            self.advice_cache[cache_key] = advice
            return advice
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return None

    def get_leakage_advice(self, category, leakage_val, root_cause):
        """
        Generate contextual advice for a savings leakage category.
        """
        cache_key = f"leak_{category}_{leakage_val}_{root_cause}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        if not self.enabled:
            return None

        prompt = f"""
        Analyze this savings leakage and suggest a specific corrective action.
        Category: {category}
        Leakage Amount: ₹{leakage_val:,.0f}
        Root Cause: {root_cause}

        Suggest a one-sentence "Manager Action" to stop this leakage. Be firm and tactical.
        Output only the string.
        """

        try:
            # New google-genai syntax
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            advice = response.text.strip()
            self.advice_cache[cache_key] = advice
            return advice
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return None

# ADK definition for Agent 1 - Intake & Classification Agent

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
    # The new engine.classify_purchase encapsulates semantic mapping
    result = engine.classify_purchase(item_description)
    return {
        "l1_category": result["l1_category"],
        "l2_category": result["predicted_category"]
    }

def check_contract(category_l2: str, plant_id: str) -> dict:
    """Queries active Contracts_Catalogue, returns preferred supplier + price"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    
    # In a real environment, we would filter by plant_id as well
    # For now, we simulate by invoking the classification engine with the L2 directly
    # Our classify_purchase handles contract mapping natively
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
    """Writes to Spend_Transactions (or staging table)"""
    from backend.data_processor import DataEngine
    import random
    engine = DataEngine()
    
    po_data = {
        "description": "Auto-generated by Agent",
        "quantity": 1,
        "category": category,
        "supplier_id": supplier_id,
        "supplier_name": "Agent Submitter",
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
    if not suppliers:
        return 0.0
    
    best_price = min([s["contracted_price"] for s in suppliers])
    leakage = (actual_amount / quantity) - best_price
    return max(leakage * quantity, 0.0)

def auto_classify_pcard(merchant_name: str, mcc_code: str) -> dict:
    """Maps to taxonomy using NLP on keywords"""
    from backend.data_processor import DataEngine
    engine = DataEngine()
    # Mocking a semantic lookup by feeding the merchant and mcc code to the classifier
    query = f"{merchant_name} {mcc_code}"
    return classify_category(query)

# ==============================================================================
# AGENT DEFINITION
# ==============================================================================

intake_agent = LlmAgent(
    name="IntakeClassificationAgent",
    description="Handles employee purchase requests and P-card bank feeds. Classifies item to taxonomy, checks for active contracts and preferred suppliers, routes to auto-PO or RFQ, calculates real-time leakage if non-preferred supplier is selected.",
    tools=[
        classify_category, 
        check_contract, 
        check_preferred_supplier, 
        create_po, 
        calculate_leakage_realtime, 
        auto_classify_pcard
    ],
    model="gemini-flash-latest",
)

# ==============================================================================
# AGENT 3 - Supplier Optimisation Agent
# ==============================================================================

def consolidation_analysis():
    """full consolidation algorithm"""
    from backend.data_processor import DataEngine
    return DataEngine().get_consolidation()

def dedup_vendor_master():
    """scans Alternate Supplier Aliases, finds duplicates"""
    from backend.data_processor import DataEngine
    df = DataEngine()._get_sheet_df('Supplier_Master')
    # Simple mock check for duplicate names/aliases
    dupes = df[df.duplicated(subset=['Supplier Name'], keep=False)]
    return dupes.to_dict(orient='records')

def detect_dormant_suppliers():
    """Last Transaction Date > 12 months, not preferred"""
    from backend.data_processor import DataEngine
    import pandas as pd
    from datetime import datetime, timedelta
    df = DataEngine()._get_sheet_df('Spend_Transactions')
    df['Invoice Date'] = pd.to_datetime(df['Invoice Date'])
    cutoff = datetime.now() - timedelta(days=365)
    recent_suppliers = df[df['Invoice Date'] >= cutoff]['Supplier ID'].unique()
    all_suppliers = df['Supplier ID'].unique()
    dormant = set(all_suppliers) - set(recent_suppliers)
    return list(dormant)

def risk_score_suppliers():
    """reads Overall Risk from Supplier_Master, classifies"""
    from backend.data_processor import DataEngine
    df = DataEngine()._get_sheet_df('Supplier_Master')
    df['Overall Risk Score'] = df['Geography Risk'] + df['Compliance Risk '] + df['Timely Delivery Risk']
    high_risk = df[df['Overall Risk Score'] > 15]
    return high_risk[['SupplierID', 'Supplier Name', 'Overall Risk Score']].to_dict(orient='records')

def detect_single_source():
    """finds categories with only 1 supplier in tail"""
    from backend.data_processor import DataEngine
    data = DataEngine().get_dashboard_kpis()
    single_source_cats = [c['category'] for c in data['category_analysis'] if c['supplier_count'] == 1]
    return single_source_cats

def draft_rfq(category_l2: str, top_suppliers: list):
    """generates RFQ text for category manager"""
    suppliers_str = ", ".join(top_suppliers)
    return f"Subject: RFQ for {category_l2}\n\nDear Category Manager,\nPlease initiate an RFQ for {category_l2}. Recommended target suppliers based on analysis: {suppliers_str}."

def contract_expiry_alerts():
    """contracts expiring in < 60 days"""
    from backend.data_processor import DataEngine
    import pandas as pd
    df = DataEngine()._get_sheet_df('Contracts_Catalogue')
    df['Expiry Date'] = pd.to_datetime(df['Expiry Date'], errors='coerce')
    cutoff = pd.Timestamp.now() + pd.Timedelta(days=60)
    expiring = df[(df['Expiry Date'] <= cutoff) & (df['Expiry Date'] > pd.Timestamp.now())]
    return expiring[['Contract ID', 'Supplier Name', 'Category L2', 'Expiry Date']].to_dict(orient='records')

optimisation_agent = LlmAgent(
    name="SupplierOptimisationAgent",
    description="Runs weekly. Consolidates supplier base by category, deduplicates vendor master aliases, detects and offboards dormant suppliers, scores risk for all tail suppliers, drafts renewal RFQs for expiring contracts, flags single-source dependencies.",
    tools=[consolidation_analysis, dedup_vendor_master, detect_dormant_suppliers,
           risk_score_suppliers, detect_single_source, draft_rfq, contract_expiry_alerts],
    model="gemini-flash-latest",
)

# ==============================================================================
# AGENT 4 - Dashboard & Insights Agent
# ==============================================================================

def fetch_db_data():
    """fetches db data"""
    from backend.data_processor import DataEngine
    return DataEngine().get_dashboard_kpis()

def fetch_leakage_data():
    """fetches leakage data"""
    from backend.data_processor import DataEngine
    return DataEngine().get_savings_leakage()

def fetch_compliance_data():
    """fetches Compliance data"""
    from backend.data_processor import DataEngine
    return DataEngine().get_compliance()

def fetch_buyer_behaviour_data():
    """fetches Buyer Behaviour data"""
    from backend.data_processor import DataEngine
    return DataEngine().get_buyer_behavior()

insights_agent = LlmAgent(
    name="DashboardInsightsAgent",
    description="Performs and fetches db data, leakage data, Compliance & Buyer Behaviour.",
    tools=[fetch_db_data, fetch_leakage_data, fetch_compliance_data, fetch_buyer_behaviour_data],
    model="gemini-flash-latest",
)
