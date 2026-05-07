from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_processor import DataEngine
from contextlib import asynccontextmanager

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

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
