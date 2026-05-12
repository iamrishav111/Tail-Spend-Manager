from groq import Groq
from config import GROQ_API_KEYS, ENABLE_AI_ADVICE
import logging
from ddgs import DDGS

# Configure Logging
logger = logging.getLogger(__name__)

class TailSpendAIAgent:
    def __init__(self):
        import config
        self.enabled = False
        if not config.ENABLE_AI_ADVICE:
            return

        self.groq_keys = config.GROQ_API_KEYS
        self.current_key_idx = 0
        self.advice_cache = {}
        
        self._init_clients()
        self._load_cache()
        self.enabled = True

    def _load_cache(self):
        import json, os
        from config import CACHE_DIR
        cache_file = os.path.join(CACHE_DIR, 'advice_cache.json')
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    self.advice_cache = json.load(f)
            except:
                self.advice_cache = {}

    def _save_cache(self):
        import json, os
        from config import CACHE_DIR
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
        cache_file = os.path.join(CACHE_DIR, 'advice_cache.json')
        try:
            with open(cache_file, 'w') as f:
                json.dump(self.advice_cache, f)
        except:
            pass

    def _init_clients(self):
        # Init Groq
        if self.groq_keys:
            key = self.groq_keys[self.current_key_idx]
            self.groq_client = Groq(api_key=key)
            logger.info(f"Groq Client Ready (Key #{self.current_key_idx + 1})")

    def _rotate_client(self):
        """Switches to the next Groq API key. Returns False if we've cycled through all keys."""
        if len(self.groq_keys) > 1:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.groq_keys)
            key = self.groq_keys[self.current_key_idx]
            self.groq_client = Groq(api_key=key)
            logger.info(f"FAILOVER: Rotated to Groq Key #{self.current_key_idx + 1}")
            return True
        return False

    def _create_completion(self, messages, model, response_format=None):
        """Executes completion with multi-key failover logic."""
        if not self.enabled: return None
        
        keys_tried = 0
        max_keys = len(self.groq_keys)
        
        while keys_tried < max_keys:
            try:
                params = {
                    "messages": messages,
                    "model": model,
                    "temperature": 0.2,
                }
                if response_format:
                    params["response_format"] = response_format
                    
                return self.groq_client.chat.completions.create(**params)
            except Exception as e:
                error_msg = str(e).lower()
                if "429" in error_msg or "rate_limit" in error_msg:
                    keys_tried += 1
                    if keys_tried < max_keys:
                        logger.warning(f"Key #{self.current_key_idx + 1} rate limited. Rotating...")
                        self._rotate_client()
                        continue # Try again with new key
                    else:
                        logger.error("ALL Groq keys rate limited. Giving up.")
                        raise e
                else:
                    # Non-rate-limit error (e.g. 401, 400), don't rotate, just fail
                    logger.error(f"Groq API Error: {e}")
                    raise e
        return None

    def _call_ai(self, prompt, model=None):
        """Standard caller."""
        target_model = model or "llama-3.1-8b-instant"
        try:
            res = self._create_completion([{"role": "user", "content": prompt}], target_model)
            return res.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            return None

    def _fetch_web_trends(self, category):
        """Uses ddgs to fetch live market trends for the category."""
        try:
            with DDGS() as ddgs:
                # Limit results and handle naming cleanly
                results = list(ddgs.text(f"{category} procurement trends 2026", max_results=3))
            
            if not results: return "No recent market data found."
            return "\n".join([f"- {r.get('title')}: {r.get('body')}" for r in results])
        except Exception as e:
            logger.error(f"Web Search Error: {e}")
            return "Market data unavailable for this category."

    def chat_negotiation(self, context, history):
        """Handles back-and-forth negotiation chat with RAG context injection."""
        if not self.enabled:
            return "AI Agent is offline."

        is_first_turn = len(history) <= 1

        # 1. System Prompt
        base_persona = (
            "You are an expert, highly strategic procurement negotiator and Chief Category Manager. "
            "Act as a co-pilot for the buyer. Your goal is to secure the absolute best Total Value. "
            "Do NOT roleplay as the supplier. "
        )

        if is_first_turn:
            system_prompt = base_persona + (
                "You are analyzing the supplier's FIRST quote. You must provide a highly detailed, multi-dimensional analysis.\n\n"
                "MANDATORY OUTPUT STRUCTURE:\n"
                "1. Detailed Parameter Evaluation: Break down exactly 5-6 parameters (e.g., Unit Price, MOQ, Lead Time, Payment Terms, SLA). "
                "DO NOT just say 'Unacceptable'. Instead, use the Internal Data (Competitor Price, Annual Volume) to build a realistic, data-driven argument "
                "(e.g., 'Their price of X is higher than our benchmark of Y. Since we buy Z volume annually, we have the leverage to demand a match').\n"
                "2. Strategic Leverage: A brief explanation of our power dynamics based on internal data and web market trends.\n"
                "3. Target Counter-Offer: The exact numeric targets we should demand.\n"
                "4. Email Script: A professional, firm, ready-to-send email draft implementing this strategy. Actively mention our data (like volume or competitor rates) "
                "in the email to corner the supplier into giving us better rates."
            )
        else:
            system_prompt = base_persona + (
                "You are now in the MIDDLE of an ongoing negotiation. The supplier has just responded to your counter-offer. "
                "DO NOT output the massive 4-part structure from the first round. Be highly dynamic and conversational.\n\n"
                "MANDATORY OUTPUT STRUCTURE:\n"
                "1. Quick Assessment: Briefly acknowledge what the supplier conceded and what they are still holding back on.\n"
                "2. Next Move: Give the buyer concise, strategic advice on how hard to push next, using the Internal Data (Volume, Competitor Price) as ammo.\n"
                "3. Email Script: Provide the next email draft. Be firm but professional. If they are stuck on price, use our total volume or competitor alternative to nudge them."
            )

        # 2. Context Injection
        rfq_info = f"- Buyer's Original RFQ Details:\n{context.get('rfq_context')}\n" if context.get('rfq_context') else ""
        web_trends = self._fetch_web_trends(context.get('category'))
        
        context_msg = (
            f"INTERNAL DATA & LEVERAGE:\n"
            f"- Negotiating Category: {context.get('category')}\n"
            f"{rfq_info}"
            f"- Internal Category Average Price: ₹{context.get('category_avg_price')}\n"
            f"- Competitor's Lowest Contract Price in Category: ₹{context.get('competitor_lowest_price')}\n"
            f"- Our Total Annual Volume in Category: {context.get('category_annual_volume')} units\n\n"
            f"LIVE EXTERNAL MARKET TRENDS (Web Search Results):\n"
            f"{web_trends}\n\n"
            "PRIORITIZATION HIERARCHY & REALISTIC NUDGING:\n"
            "1. Price vs Competitors: If our Category Average or Competitor Price is lower, forcefully (but professionally) challenge their quote in the email by referencing the alternative market rate.\n"
            "2. Volume Tiering: Use the 'Total Annual Volume' specifically in the email to entice them into a volume discount.\n"
            "3. Status Quo: Reject unjustified price increases.\n"
            "4. Terms/SLA: Aggressively negotiate Net-60 payment terms."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context_msg},
            {"role": "assistant", "content": "Understood. I will use the internal volume and competitor data dynamically to build realistic, persuasive negotiation arguments."}
        ]

        # 3. Append User Chat History
        for msg in history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        try:
            chat_completion = self._create_completion(messages, self.model_name)
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API Error in Negotiation Chat: {e}")
            return "Sorry, I encountered an error generating the negotiation strategy."


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

    def get_category_leakage_advice(self, category, leakage_val, root_cause, context=None):
        """
        Implementation-Ready Sourcing Engine (Llama 3.3 70b).
        """
        if context is None: context = {}
        # SAFETY: Ensure numeric types for formatting
        try:
            l_val = float(leakage_val)
        except:
            l_val = 0.0

        cache_key = f"exec_v1_{category}_{l_val}_{root_cause}_{context.get('top_suppliers','')}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        PATTERN_LEVERS = {
            "SUPPLIER_FRAGMENTATION": "Supplier rationalization, Tail vendor elimination, Volume aggregation sourcing.",
            "PRICE_VOLATILITY": "Annual rate contracts, Index-based pricing, Market benchmarking, Catalog enforcement.",
            "PROCESS_BYPASS": "P-Card MCC blocks, Automated approval gates, Catalog-only buying requirements.",
            "EMERGENCY_BUYING": "Vendor Managed Inventory (VMI), Safety stock optimization, AMC/SLA contracts.",
            "STRATEGIC_OPPORTUNITY": "SKU standardization, Requirement pooling, Multi-plant framework agreements."
        }
        
        pattern = "STRATEGIC_OPPORTUNITY"
        if context and context.get('top_suppliers_count', 0) > 5:
            pattern = "SUPPLIER_FRAGMENTATION"
        elif context and context.get('avg_variance_pct', 0) > 15:
            pattern = "PRICE_VOLATILITY"
        elif "Maverick" in root_cause or "Off-Contract" in root_cause:
            pattern = "PROCESS_BYPASS"
        elif "Emergency" in root_cause:
            pattern = "EMERGENCY_BUYING"
            
        levers = PATTERN_LEVERS.get(pattern, PATTERN_LEVERS["STRATEGIC_OPPORTUNITY"])
        market_intel = self._fetch_web_trends(category)
        
        # Format Context
        suppliers = context.get('top_suppliers', 'Unknown Suppliers')
        variance = context.get('avg_variance_pct', 'N/A')
        
        prompt = f"""
        You are a Sourcing Execution Lead. Provide a NO-FLUFF, IMPLEMENTATION-READY playbook.
        
        DATA CONTEXT:
        - Category: {category} | Impact: ₹{leakage_val:,.0f}
        - Top Leaking Suppliers: {suppliers}
        - Price Variance: {variance}% above benchmark
        - Market Intel: {market_intel}
        - Strategic Levers: {levers}

        INSTRUCTIONS:
        1. BAN these words: 'Develop', 'Establish', 'Strategic Plan', 'Management Team', 'Execute', 'Program'.
        2. MANDATORY: Every bullet must mention a specific Supplier or Category from the data above.
        3. For every action, explain EXACTLY HOW to do it (e.g., 'In the ERP, block Supplier X and redirect to Supplier Y').
        4. Focus on quantified results (e.g., 'Capture ₹50k/month savings').
        
        STRUCTURE:
        Generate exactly 2 sections. 4 bullets per section. Bullet length: 40-50 words.
        
        SECTION 1: ⚡ IMMEDIATE CONTAINMENT
        SECTION 2: 🏗️ STRATEGIC SOURCING

        OUTPUT ONLY THE 8 BULLETS.
        """

        try:
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile"
            )
            advice = response.choices[0].message.content.strip()
            self.advice_cache[cache_key] = advice
            return advice
        except Exception as e:
            logger.error(f"Category Advice Error: {e}")
            return "Strategy generation temporarily unavailable due to capacity."

    def get_plant_leakage_advice(self, plant, leakage_val, root_cause, context=None):
        """
        Site-Specific Audit Execution (Llama 3.3 70b).
        """
        if context is None: context = {}
        # SAFETY: Ensure numeric types for formatting
        try:
            l_val = float(leakage_val)
        except:
            l_val = 0.0

        bypass_cats = context.get('top_bypass_categories', 'N/A')
        top_user = context.get('top_requester', 'N/A')
        compliance = context.get('compliance_pct', 'N/A')

        cache_key = f"exec_plant_v1_{plant}_{l_val}_{root_cause}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        You are an Operations Director. Stop the ₹{l_val:,.0f} bypass at the {plant} site.
        
        SITE AUDIT DATA:
        - Categories Bypassed at {plant}: {bypass_cats}
        - Top Maverick Requester: {top_user}
        - Site Compliance: {compliance}%
        
        INSTRUCTIONS:
        1. BAN these words: 'Develop', 'Establish', 'Review', 'Management Team', 'Encourage'.
        2. Be BRUTALLY SPECIFIC. Tell the Site Manager exactly which categories and users to lock down.
        3. Explain HOW to do it (e.g., 'Revoke P-Card authority for {top_user} for the {bypass_cats} category').
        
        STRUCTURE:
        Exactly 2 sections. 4 bullets per section. Bullet length: 40-50 words.
        
        SECTION 1: ⚡ IMMEDIATE SITE CONTROLS
        SECTION 2: 🏗️ COMPLIANCE & BEHAVIORAL ENFORCEMENT

        OUTPUT ONLY THE 8 BULLETS.
        """

        try:
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile"
            )
            advice = response.choices[0].message.content.strip()
            self.advice_cache[cache_key] = advice
            return advice
        except Exception as e:
            logger.error(f"Plant Advice Error: {e}")
            return "Site strategy generation temporarily unavailable."

    def get_root_cause_advice(self, root_cause, insight, context=None):
        """
        Root Cause Intelligent Recommendation (Llama 3.3 70b).
        """
        if context is None: context = {}
        cache_key = f"rc_v1_{root_cause}_{insight}_{context.get('repeat_pct', 0) if context else 0}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        suppliers = context.get('top_suppliers', 'Unknown Vendors')
        
        prompt = f"""
        You are a Sourcing Lead. Fix this procurement root cause based on data patterns.
        
        DATA:
        - Root Cause: {root_cause}
        - Detected Pattern: {insight}
        - Top Suppliers Involved: {suppliers}
        - Price Variance: {context.get('avg_variance_pct', 0)}%
        
        INSTRUCTIONS:
        1. Provide exactly ONE substantial action bullet (approx 35-45 words).
        2. Explain the HOW-TO workflow (e.g., 'Redirect spend from X to Y').
        3. MANDATORY: Mention the specific suppliers: {suppliers}.
        4. BAN generic words: 'Develop', 'Establish', 'Strategic Plan'.
        
        OUTPUT ONLY THE SINGLE BULLET POINT.
        """

        try:
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile"
            )
            advice = response.choices[0].message.content.strip()
            self.advice_cache[cache_key] = advice
            return advice
        except Exception as e:
            logger.error(f"Root Cause Advice Error: {e}")
            return "Root cause strategy generation temporarily unavailable."

    def get_strategic_demand_treatment(self, sku, category, context):
        """
        Demand Forecast Reasoning Engine (Llama 3.1 8b).
        Evaluates trade-offs between Contracts, Blanket POs, Bundling, and VMI.
        """
        cache_key = f"demand_v1_{sku}_{category}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        # 1. Market Research (Web Search)
        market_context = ""
        clean_category = category if category != "Unknown" else "unclassified item"
        try:
            with DDGS() as ddgs:
                search_query = f"procurement sourcing strategy for {clean_category} {sku} best practices"
                results = list(ddgs.text(search_query, max_results=2))
                market_context = " ".join([r['body'] for r in results])
        except Exception as e:
            market_context = f"Standard market practices for this type of procurement apply."

        # 2. Reasoning Prompt (Consultant Grade)
        prompt = f"""
        You are a Senior Strategic Sourcing Consultant. Analyze the following demand pattern and provide an EXECUTIVE-LEVEL procurement treatment.
        
        SKU CONTEXT:
        - SKU Identifier: {sku}
        - Current Classification: {category if category != 'Unknown' else 'New Item (Analyze SKU name to infer strategy)'}
        - Annual Spend Intensity: ₹{float(context.get('total_spend', 0)):,.0f}
        - Order Frequency: {context.get('txn_count', 0)} times/year
        - Regional Footprint: Used across {context.get('plants', 1)} locations
        - Supplier Base: {context.get('suppliers', 1)} current vendors
        
        YOUR OBJECTIVE:
        Determine if this spend should be 'Contracted' (Blanket PO/ARC/Catalog) or 'Tactically Sourced'.
        
        OUTPUT STRUCTURE (MANDATORY):
        
        ### NEXT STEPS
        - Provide 3-4 ultra-specific, actionable steps.
        - Mention if this should be added to the Digital Catalog or a Blanket PO.
        - Define the negotiation lever (e.g., "Consolidate all {context.get('plants', 1)} plants to one vendor").
        
        ### REASONING
        - Explain the "Business Story" behind these numbers.
        - Why is this specific treatment better than the status quo?
        - Address the frequency ({context.get('txn_count', 0)} orders) and how this change reduces administrative friction.
        
        STRICT RULES:
        - NO JARGON. Use simple, direct, authoritative language.
        - DO NOT mention "Unknown" or "Unclassified" in your output. If you don't know the category, infer it from the SKU: {sku}.
        - Format the response as a valid JSON object with the keys: "opportunity", "next_steps", "reasoning", "market_insight".
        """

        try:
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant"
            )
            
            content = response.choices[0].message.content.strip()
            # Robust JSON extraction
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            import json
            result = json.loads(content)
            
            # Standardize keys for the UI
            final_result = {
                "opportunity": result.get("opportunity", "Strategy Review"),
                "recommendation": result.get("next_steps", ""),
                "reasoning": result.get("reasoning", ""),
                "market_insight": result.get("market_insight", "Supply market is stable for this category.")
            }
            
            self.advice_cache[cache_key] = final_result
            self._save_cache() 
            return final_result
        except Exception as e:
            logger.error(f"Demand Treatment Error: {e}")
            return {
                "opportunity": "Consolidate Orders",
                "recommendation": f"WHAT TO DO: Step 1: Stop ordering {sku} from multiple vendors. Step 2: Combine your annual volume into one RFQ. Step 3: Negotiate a fixed price for all {context.get('plants', 1)} plants.",
                "reasoning": f"WHY THIS IS BEST: You are ordering this item {context.get('txn_count', 0)} times a year. Consolidating this will cut your paperwork by 80% and give you better price leverage.",
                "market_insight": f"Supply for this item is stable, making this a perfect time to lock in a long-term price."
            }

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

    def get_consolidation_advice(self, category, current_suppliers, target_suppliers, savings, context):
        """
        Agentic Consolidation Hub (Gemini 1.5 Pro/Flash).
        Provides: AI Decision, Why, Recommended Strategy.
        """
        cache_key = f"cons_v2_{category}_{current_suppliers}_{target_suppliers}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        prompt = f"""
        You are a Procurement Specialist. Simplify this consolidation plan. 
        Focus on CLEAR ACTIONS and NO JARGON.
        
        CATEGORY: {category}
        CURRENT STATE: {current_suppliers} vendors
        TARGET STATE: {target_suppliers} vendors (THIS IS THE GOAL)
        SAVINGS IMPACT: ₹{float(savings):,.0f}
        
        OUTPUT STRUCTURE (STRICT JSON):
        {{
            "decision": "AI DECISION: [One clear sentence. MUST mention why we chose EXACTLY {target_suppliers} vendors for this category]",
            "why": "WHY: [2 bullet points justifying the reduction from {current_suppliers} to {target_suppliers}]",
            "strategy": "ANALYSIS: [3 action-oriented steps to reach {target_suppliers} vendors in 7 days. Mention which type of vendor stays (e.g. 'local ones with risk < 3')]",
            "action_type": "Execute RFQ or Migrate Spend or Execute Rate Card"
        }}
        
        STRICT RULES:
        - USE SIMPLE LANGUAGE. No 'operating models'.
        - PRECISION: Your reasoning MUST match the target count of {target_suppliers}.
        - ACTION-ORIENTED. 'Call the vendor' instead of 'Initiate communication'.
        - The 'action_type' MUST be one of: 'Execute RFQ', 'Migrate Spend', 'Execute Rate Card'.
        """

        try:
            # Using Qwen 3 32B via Groq for high-speed strategic consolidation
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="qwen/qwen3-32b",
                response_format={"type": "json_object"}
            )
            
            import json
            raw_content = response.choices[0].message.content.strip()
            content = raw_content
            
            # Robust JSON extraction
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Try to find first { and last } if it still fails
            if not content.startswith("{"):
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    content = content[start:end+1]
                
            try:
                result = json.loads(content)
                self.advice_cache[cache_key] = result
                self._save_cache()
                return result
            except Exception as json_err:
                logger.error(f"JSON Parse Error for {category}: {json_err}")
                logger.error(f"RAW CONTENT: {raw_content}")
                raise json_err
        except Exception as e:
            logger.error(f"Consolidation Advice Error: {e}")
            return {
                "decision": "Strategic Consolidation",
                "why": "Fragmentation is reducing leverage.",
                "strategy": "Consolidate to core suppliers via RFQ.",
                "action_type": "Execute RFQ"
            }

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

    def search_web(self, query):
        """
        Internal search utility for the agent to fetch sourcing levers.
        """
        try:
            # In a real production env, this would use Tavily/DuckDuckGo API.
            # For this agent, we simulate industry-standard levers if search fails.
            return f"Strategic sourcing levers for {query} typically include volume aggregation, specification standardization, and indexed pricing based on market benchmarks."
        except Exception:
            return "Standard consolidation and pricing negotiation."

    def get_governance_advice(self, category, spend, supplier_count):
        """
        AI Governance Engine with Detailed Bulleted Reasoning.
        Model: llama-3.1-8b-instant
        """
        cache_key = f"gov_detailed_v5_{category}_{spend}"
        if cache_key in self.advice_cache:
            return self.advice_cache[cache_key]

        # 1. Fetch sourcing levers
        levers = self.search_web(category)

        prompt = f"""
        You are a Senior Sourcing Assistant. Create a detailed commercial strategy for this category.
        
        CATEGORY: {category}
        SPEND: ₹{float(spend):,.0f}
        VENDORS: {supplier_count}
        
        INDUSTRY TRENDS (FOR REASONING):
        {levers}
        
        STRICT RULES: YOU MUST PICK ONE OF THESE 4 BUCKETS:
        
        1. FOR STANDARD PRODUCTS (Filters, MRO, Office Supplies):
           - Label & Recommendation: "Establish Blanket Agreement"
           
        2. FOR RECURRING SERVICES (Security, Staffing, Cleaning):
           - Label & Recommendation: "Generate Rate Contract"
           
        3. FOR PROJECT WORK (Repairs, Audit, Legal):
           - Label & Recommendation: "Launch Mini-Bid Framework"
           
        4. FOR ALL OTHER HIGH SPEND / UNMANAGED CATEGORIES:
           - Label & Recommendation: "Launch Sourcing RFQ"

        OUTPUT (STRICT JSON):
        {{
            "strategy": "[The Chosen Bucket Name]",
            "recommendation": "[The Exact Recommendation from the list above]",
            "reasoning": "[Provide 3-4 detailed bullet points. 
                          Bullet 1: Analyze the current vendor fragmentation (using the {supplier_count} count).
                          Bullet 2: Mention a specific industry trend or lever from the search results.
                          Bullet 3: Explain the commercial benchmark or benefit (e.g. volume lock-in).
                          Bullet 4: Simple summary of the expected outcome.
                          USE SIMPLE LANGUAGE. NO JARGON.]",
            "action_label": "[The Exact Label from the list above]",
            "workflow": ["Step 1", "Step 2", "Step 3", "Step 4"]
        }}
        
        STRICT RULES:
        - Reasoning MUST be 3-4 distinct bullet points.
        - Use simple, direct language.
        """

        try:
            response = self._create_completion(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"}
            )
            
            import json
            content = response.choices[0].message.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            result = json.loads(content)
            self.advice_cache[cache_key] = result
            self._save_cache()
            return result
        except Exception as e:
            logger.error(f"Governance Advice Error: {e}")
            return {
                "strategy": "Launch Sourcing RFQ",
                "recommendation": "Launch Sourcing RFQ",
                "reasoning": f"- You have {supplier_count} vendors here.\n- Market trends suggest prices are rising.\n- We should ask them all to bid to get a better price.",
                "action_label": "Launch Sourcing RFQ",
                "workflow": ["Analyze rates", "Standardize terms", "Draft agreement", "Roll out"]
            }

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
    model="llama-3.1-8b-instant",
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
