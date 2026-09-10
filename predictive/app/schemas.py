from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Congestion
class CongestionRequest(BaseModel):
    junctionId: str

class CongestionPrediction(BaseModel):
    timestamp: str
    predictedVph: int
    lowerBound: int
    upperBound: int

class CongestionResponse(BaseModel):
    junctionId: str
    predictions: List[CongestionPrediction]
    modelUsed: str

# Flood Risk
class FloodRiskRequest(BaseModel):
    zoneId: str
    currentWaterLevel: float
    rainfall: float

class FloodRiskResponse(BaseModel):
    zoneId: str
    riskScore: float
    riskCategory: str
    factors: List[str]

# Anomaly Detection
class AnomalyRequest(BaseModel):
    junctionId: str
    currentValue: float
    recentReadings: List[float]

class AnomalyResponse(BaseModel):
    isAnomaly: bool
    currentValue: float
    rollingMean: float
    standardDeviation: float
    threshold: float
    details: str
