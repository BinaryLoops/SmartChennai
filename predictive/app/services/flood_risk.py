from app.schemas import FloodRiskResponse

def calculate_flood_risk(zone_id: str, current_water_level: float, rainfall: float) -> FloodRiskResponse:
    # Deterministic flood risk scoring based on Phase 5 thresholds:
    # watch = 80, warning = 120, danger = 160
    
    score = 0
    category = "LOW"
    factors = []
    
    # Base score from water level
    if current_water_level >= 160:
        score += 80
        category = "CRITICAL"
        factors.append("Water level is critically high (>160cm)")
    elif current_water_level >= 120:
        score += 60
        category = "HIGH"
        factors.append("Water level has reached warning threshold (>120cm)")
    elif current_water_level >= 80:
        score += 40
        category = "MODERATE"
        factors.append("Water level has reached watch threshold (>80cm)")
    else:
        score += (current_water_level / 80) * 30
        category = "LOW"
        factors.append("Water level is within normal bounds")
        
    # Additional risk from rainfall
    if rainfall > 20:
        score += 30
        factors.append("Heavy rainfall is severely increasing risk")
        if category in ["LOW", "MODERATE"]: category = "HIGH"
    elif rainfall > 5:
        score += 15
        factors.append("Moderate rainfall contributing to rising levels")
        if category == "LOW": category = "MODERATE"
        
    score = min(100, max(0, score))
    
    # Ensure category reflects final score if it tipped over
    if score >= 90: category = "CRITICAL"
    elif score >= 70: category = "HIGH"
    elif score >= 40: category = "MODERATE"
    else: category = "LOW"
        
    return FloodRiskResponse(
        zoneId=zone_id,
        riskScore=round(score, 1),
        riskCategory=category,
        factors=factors
    )
