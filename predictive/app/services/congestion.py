from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from app.db import db
from app.schemas import CongestionResponse, CongestionPrediction

async def predict_congestion(junction_id: str) -> CongestionResponse:
    # Fetch historical readings for the past 6 hours (assuming 5-min intervals = ~72 points)
    query = """
        SELECT "timestamp", "vehiclesPerHour"
        FROM "TrafficReading"
        WHERE "junctionId" = $1
        ORDER BY "timestamp" DESC
        LIMIT 100
    """
    records = await db.fetch(query, junction_id)
    
    if len(records) < 5:
        # Insufficient data even for a fallback
        return CongestionResponse(
            junctionId=junction_id,
            predictions=[],
            modelUsed="InsufficientData"
        )
        
    # Sort chronologically
    df = pd.DataFrame(records, columns=['timestamp', 'vehiclesPerHour'])
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    df['vehiclesPerHour'] = df['vehiclesPerHour'].astype(float)
    
    last_timestamp = df['timestamp'].iloc[-1]
    last_val = df['vehiclesPerHour'].iloc[-1]
    
    # We need to predict next 30 mins -> 6 points of 5 mins each
    predictions = []
    model_used = "WeightedMovingAverage"
    
    # Check if we have enough data and variance for ARIMA
    # Let's say we need at least 30 points and non-zero variance
    if len(df) >= 30 and df['vehiclesPerHour'].var() > 0:
        try:
            # The current implementation uses ARIMA when sufficient historical data is available. 
            # The fallback weighted moving average is the replacement point for a trained production model.
            model = ARIMA(df['vehiclesPerHour'], order=(1, 1, 1))
            fitted = model.fit()
            
            # Forecast next 6 steps
            forecast = fitted.get_forecast(steps=6)
            mean_forecast = forecast.predicted_mean.values
            conf_int = forecast.conf_int(alpha=0.2).values # 80% confidence
            
            model_used = "ARIMA"
            
            for i in range(6):
                fut_time = last_timestamp + timedelta(minutes=5 * (i + 1))
                predictions.append(CongestionPrediction(
                    timestamp=fut_time.isoformat(),
                    predictedVph=max(0, int(mean_forecast[i])),
                    lowerBound=max(0, int(conf_int[i][0])),
                    upperBound=max(0, int(conf_int[i][1]))
                ))
                
        except Exception as e:
            print(f"ARIMA failed: {e}. Falling back to WMA.")
            model_used = "WeightedMovingAverage"
            predictions = []

    if model_used == "WeightedMovingAverage" or not predictions:
        # Fallback Weighted Moving Average
        # The current implementation uses ARIMA when sufficient historical data is available. 
        # The fallback weighted moving average is the replacement point for a trained production model.
        recent = df['vehiclesPerHour'].tail(6).values
        weights = np.linspace(0.5, 1.0, len(recent))
        wma = np.average(recent, weights=weights)
        
        # Simple diurnal adjustment simulation for 6 steps
        # In a real model, we would use the hour of day, but a flat prediction based on WMA is safe
        for i in range(6):
            fut_time = last_timestamp + timedelta(minutes=5 * (i + 1))
            
            hour = fut_time.hour
            trend = 0
            if 6 <= hour <= 10: trend = 20 * (i + 1)
            elif 16 <= hour <= 20: trend = 30 * (i + 1)
            elif hour >= 23 or hour <= 4: trend = -15 * (i + 1)
            
            pred_val = max(0, int(wma + trend))
            predictions.append(CongestionPrediction(
                timestamp=fut_time.isoformat(),
                predictedVph=pred_val,
                lowerBound=max(0, int(pred_val * 0.8)),
                upperBound=int(pred_val * 1.2)
            ))
            
    return CongestionResponse(
        junctionId=junction_id,
        predictions=predictions,
        modelUsed=model_used
    )
