import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# --- Core Configurations ---
SHEET_ID = os.getenv("SHEET_ID", "")
# --- AI Configuration ---
ENABLE_AI_ADVICE = True    # Master toggle for AI
AI_PROVIDER = "groq"       # Options: "gemini", "groq"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# AI & Classification Thresholds
# Minimum score (0-1) for AI prediction
AI_CONFIDENCE_THRESHOLD = 0.4
# Minimum characters in description before classification triggers
MIN_DESCRIPTION_LENGTH = 3

# Procurement Business Rules
# Risk score (0-10) below which a supplier is recommended
PREFERRED_RISK_THRESHOLD = 4.0
# Amount in INR above which approval is required
AUTO_APPROVAL_THRESHOLD = 10000

# Cache Configuration
CACHE_DIR = os.path.join(os.path.dirname(__file__), '.cache')

# --- Tail Spend & Maverick Logic ---
TAIL_PERCENTILE = 0.8
MAVERICK_VALUE_THRESHOLD = 5000

# --- Root Cause Labels ---
ROOT_CAUSE_MAVERICK = "Maverick Buy"
ROOT_CAUSE_PCARD = "P-Card Leakage"
ROOT_CAUSE_EMERGENCY = "Emergency/Spot Buy"
ROOT_CAUSE_NO_CONTRACT = "No Contract"
ROOT_CAUSE_DEFAULT = "Fragmented Spend (Sub-P80)"

# --- Savings Leakage Logic ---
LEAKAGE_CRITICAL_LIMIT = 1000000
LEAKAGE_HIGH_LIMIT = 500000
LEAKAGE_MEDIUM_LIMIT = 100000
ESTIMATED_CONTRACT_SAVINGS_PCT = 0.15

# --- Savings Leakage Labels & Advice ---
LEAKAGE_RC_EMERGENCY = "Emergency bypass"
LEAKAGE_RC_PCARD = "P-Card leakage"
LEAKAGE_RC_DIRECT = "Direct payment"
LEAKAGE_RC_SPOT = "Spot buy"

LEAKAGE_FIX_MAP = {
    LEAKAGE_RC_EMERGENCY: "Set up blanket POs for repeat emergency items.",
    LEAKAGE_RC_PCARD: "Restrict P-Card usage for this category; mandate PO.",
    LEAKAGE_RC_DIRECT: "Enforce 'No PO, No Pay' policy for this supplier.",
    LEAKAGE_RC_SPOT: "Create a negotiated price contract in the catalogue."
}

LEAKAGE_MEANING_MAP = {
    LEAKAGE_RC_EMERGENCY: "Urgent purchases made outside contracted channels.",
    LEAKAGE_RC_PCARD: "Bypassing procurement controls via credit cards.",
    LEAKAGE_RC_DIRECT: "Direct non-PO payments bypassing all visibility.",
    LEAKAGE_RC_SPOT: "Unplanned, non-contracted one-off purchases."
}

# --- Display & Time Limits ---
DASHBOARD_LOOKBACK_DAYS = 90
LIVE_FEED_LIMIT = 10
MAX_FORECAST_ITEMS_DISPLAY = 10

# --- Consolidation & Strategy ---
CONSOLIDATION_SAVINGS_FACTOR = 0.12      # 12% savings assumed
CONSOLIDATION_TARGET_SUPPLIERS = 2       # Ideal number of vendors to consolidate into
HIGH_PRIORITY_SPEND_MIN = 1000000        # ₹10L spend triggers High Priority alert
MEDIUM_PRIORITY_TAIL_PCT = 0.6           # 60% tail spend triggers Medium Priority
UNCONTROLLED_MIN_TXNS = 5                # Min transactions to flag uncontrolled spend
UNCONTROLLED_MIN_SPEND = 100000          # Min spend (₹1L) to flag uncontrolled spend

# --- Demand Forecast Logic ---
PREDICTED_TAIL_TREND_MULTIPLIER = 1.05  # 5% buffer for future tail spend
MIN_PLANTS_FOR_POOLING = 3             # Min plants needed to flag a pooling opportunity
MAX_REORDER_DAYS_FOR_POOLING = 60      # Max reorder frequency for pooling
RECURRING_TAIL_THRESHOLD_DAYS = 14     # Items ordered more often than this are "Recurring"
ESTIMATED_POOLING_SAVINGS_PCT = 0.15   # 15% assumed savings for new pooling

# --- Supplier Scoring Weights (Total = 1.0) ---
WEIGHT_PRICE = 0.5
WEIGHT_RISK = 0.3
WEIGHT_LEAD_TIME = 0.2

# --- Agent Recommendations ---
ADVICE_TEMPLATE_CRITICAL = "CRITICAL: High-velocity item (every {freq:.0f} days). Bypassing contract daily. Immediate sourcing required."
ADVICE_TEMPLATE_STRATEGIC = "STRATEGIC: Multi-plant leak detected across {plants} locations. Bulk consolidation opportunity."
ADVICE_TEMPLATE_OPPORTUNITY = "OPPORTUNITY: High volume ({qty:,.0f} units) unmanaged. Negotiate volume-based pricing."
ADVICE_TEMPLATE_DEFAULT = "Urgent: Fast moving item. Strategic sourcing recommended."

# Logging
LOG_LEVEL = "INFO"
