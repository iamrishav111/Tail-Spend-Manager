from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_processor import DataEngine
from contextlib import asynccontextmanager
import PyPDF2
import io

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    print("Backend starting up...")
    try:
        engine = DataEngine()
        print("Backend ready.")
    except Exception as e:
        print(f"Backend failed to initialize: {e}")
    yield
    print("Backend shutting down...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = None

@app.get("/api/status")
def get_status():
    return {"status": "online", "engine": "ready" if engine else "loading"}

@app.get("/api/dashboard/kpis")
def get_dashboard_kpis():
    return {"status": "success", "data": engine.get_dashboard_kpis()}

@app.get("/api/dashboard/contract-decisions")
def get_contract_decisions():
    return {"status": "success", "data": engine.get_contract_decisions()}

@app.get("/api/dashboard/catalog")
def get_catalog():
    return {"status": "success", "data": engine.get_catalog()}

@app.get("/api/dashboard/catalog-recommendations")
def get_catalog_recommendations():
    return {"status": "success", "data": engine.get_catalog_recommendations()}

@app.get("/api/dashboard/savings-leakage")
def get_savings_leakage():
    return {"status": "success", "data": engine.get_savings_leakage()}

@app.get("/api/dashboard/category-suppliers")
def get_category_suppliers():
    return {"status": "success", "data": engine.get_category_suppliers()}

@app.get("/api/dashboard/consolidation")
def get_consolidation():
    return {"status": "success", "data": engine.get_consolidation()}

@app.get("/api/dashboard/buyer-behavior")
def get_buyer_behavior():
    return {"status": "success", "data": engine.get_buyer_behavior()}

@app.get("/api/dashboard/compliance")
def get_compliance():
    return {"status": "success", "data": engine.get_compliance()}

@app.get("/api/dashboard/demand-forecast")
def get_demand_forecast():
    return {"status": "success", "data": engine.get_demand_forecast()}

class PurchaseRequest(BaseModel):
    description: str

@app.post("/api/classify-purchase")
def classify_purchase(req: PurchaseRequest):
    result = engine.classify_purchase(req.description)
    return {"status": "success", "data": result}

@app.post("/api/submit-po")
def submit_po(po_data: dict):
    result = engine.submit_po(po_data)
    return {"status": "success", "data": result}

@app.post("/api/add-to-catalog")
def add_to_catalog(item_data: dict):
    result = engine.add_to_catalog(item_data)
    return {"status": "success", "data": result}

@app.get("/api/purchase-history")
def get_purchase_history():
    return {"status": "success", "data": engine.get_purchase_history()}

@app.post("/api/admin/refresh-logic")
def refresh_logic():
    return engine.refresh_logic()

class NegotiationRequest(BaseModel):
    category: str
    rfq_context: str = ""
    history: list

@app.post("/api/negotiation/chat")
def negotiation_chat(req: NegotiationRequest):
    context = engine.get_negotiation_context(req.category)
    context['rfq_context'] = req.rfq_context
    response = engine.ai_agent.chat_negotiation(context, req.history)
    return {"status": "success", "data": {"reply": response}}

@app.post("/api/ai/demand-reasoning")
def get_demand_reasoning(req: dict):
    """Lazy-loaded AI reasoning for Demand Forecast items."""
    sku = req.get('sku')
    category = req.get('category')
    context = req.get('context')
    return {"status": "success", "data": engine.ai_agent.get_strategic_demand_treatment(sku, category, context)}

@app.post("/api/ai/root-cause-advice")
def get_root_cause_advice(req: dict):
    """Lazy-loaded AI reasoning for Root Causes."""
    rc = req.get('root_cause')
    insight = req.get('insight')
    context = req.get('context')
    return {"status": "success", "data": engine.ai_agent.get_root_cause_advice(rc, insight, context)}

@app.post("/api/ai/plant-advice")
def get_plant_advice(req: dict):
    """Lazy-loaded AI reasoning for Plants."""
    plant_id = req.get('plant_id')
    dom_rc = req.get('root_cause')
    leakage = req.get('leakage')
    return {"status": "success", "data": engine.ai_agent.get_plant_leakage_advice(plant_id, dom_rc, leakage)}

@app.post("/api/ai/category-advice")
def get_category_advice(req: dict):
    """Lazy-loaded AI reasoning for Categories (Detailed 8-bullet playbook)."""
    category = req.get('category')
    leakage = req.get('leakage')
    root_cause = req.get('root_cause')
    context = req.get('context')
    return {"status": "success", "data": engine.ai_agent.get_category_leakage_advice(category, leakage, root_cause, context)}

@app.get("/api/negotiation/meta")
def negotiation_meta():
    suppliers = engine.df_main['Supplier Name Raw'].dropna().unique().tolist()
    categories = engine.df_main['Booked Category'].dropna().unique().tolist()
    return {"status": "success", "data": {"suppliers": sorted(suppliers), "categories": sorted(categories)}}

@app.post("/api/negotiation/parse-document")
async def parse_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        extracted_text = ""
        
        if file.filename.lower().endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    extracted_text += page.extract_text() + "\n"
            except Exception as e:
                return {"status": "error", "message": f"Failed to parse PDF: {str(e)}"}
        else:
            # Assume text based
            extracted_text = content.decode('utf-8', errors='ignore')
            
        return {"status": "success", "data": {"text": extracted_text.strip()}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
