from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.db import db
from app.schemas import (
    CongestionRequest, CongestionResponse,
    FloodRiskRequest, FloodRiskResponse,
    AnomalyRequest, AnomalyResponse
)
from app.services.congestion import predict_congestion
from app.services.flood_risk import calculate_flood_risk
from app.services.anomaly import detect_anomaly

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(
    title="Smart Chennai Predictive AI Service",
    description="Phase 7 AI Microservice for Congestion, Flood Risk, and Anomaly Detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "predictive-layer"}

@app.post("/predict/congestion", response_model=CongestionResponse)
async def endpoint_congestion(req: CongestionRequest):
    try:
        res = await predict_congestion(req.junctionId)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/flood-risk", response_model=FloodRiskResponse)
async def endpoint_flood_risk(req: FloodRiskRequest):
    try:
        res = calculate_flood_risk(req.zoneId, req.currentWaterLevel, req.rainfall)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/anomaly", response_model=AnomalyResponse)
async def endpoint_anomaly(req: AnomalyRequest):
    try:
        res = detect_anomaly(req.junctionId, req.currentValue, req.recentReadings)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
