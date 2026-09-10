import numpy as np
from typing import List
from app.schemas import AnomalyResponse

def detect_anomaly(junction_id: str, current_value: float, recent_readings: List[float]) -> AnomalyResponse:
    if len(recent_readings) < 5:
        return AnomalyResponse(
            isAnomaly=False,
            currentValue=current_value,
            rollingMean=0.0,
            standardDeviation=0.0,
            threshold=0.0,
            details="Insufficient historical data to detect anomalies reliably."
        )
        
    mean = np.mean(recent_readings)
    std_dev = np.std(recent_readings)
    
    # Avoid zero variance edge cases causing tiny anomalies
    if std_dev < 5.0:
        std_dev = 5.0
        
    threshold = mean + 2 * std_dev
    is_anomaly = current_value > threshold
    
    details = f"Current value {current_value} is "
    if is_anomaly:
        details += f"greater than the +2 SD threshold of {threshold:.1f}."
    else:
        details += f"within normal bounds (threshold: {threshold:.1f})."

    return AnomalyResponse(
        isAnomaly=bool(is_anomaly),
        currentValue=current_value,
        rollingMean=float(mean),
        standardDeviation=float(std_dev),
        threshold=float(threshold),
        details=details
    )
