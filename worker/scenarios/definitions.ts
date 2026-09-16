import { ScenarioDefinition, CausalModifiers } from "../../packages/types/scenarios";

export const SCENARIO_DEFINITIONS: Record<string, ScenarioDefinition> = {
  NORMAL_DAY: {
    id: "NORMAL_DAY",
    name: "Normal Day",
    description: "Baseline city operations with normal fluctuations.",
    targetModifiers: {
      trafficFriction: 0.0,
      waterLevelMultiplier: 0.0,
      drainageLoad: 0.0,
      floodRiskMultiplier: 0.0,
      aqiMultiplier: 0.0,
      temperatureShift: 0.0,
      pm25Multiplier: 0.0,
      rainfallMultiplier: 0.0,
      noiseMultiplier: 0.0,
      powerGridAvailability: 1.0,
      wasteGenerationMultiplier: 0.0,
      emergencyDemandMultiplier: 0.0
    },
    events: []
  },
  HEAVY_RAIN: {
    id: "HEAVY_RAIN",
    name: "Heavy Rain",
    description: "Prolonged heavy rainfall increasing drainage load and traffic friction.",
    targetModifiers: {
      trafficFriction: 0.40,        // +40% congestion
      waterLevelMultiplier: 1.5,    // +150% water level baseline
      drainageLoad: 0.80,           // 80% drainage load
      floodRiskMultiplier: 0.60,    // +60% flood risk
      aqiMultiplier: -0.30,         // -30% AQI (cleaner air)
      pm25Multiplier: -0.50,        // Rain washes out PM2.5
      rainfallMultiplier: 5.0,      // Heavy rain mm/h multiplier
      noiseMultiplier: 0.20,        // Louder ambient noise from rain
      temperatureShift: -3.0,       // -3 degrees
      powerGridAvailability: 0.95,  // 5% power grid degraded
      emergencyDemandMultiplier: 0.30 // +30% emergency demand
    },
    events: [
      { threshold: 0.2, type: "ENVIRONMENT", severity: "INFO", description: "Heavy rainfall started", category: "primary" },
      { threshold: 0.5, type: "WATER", severity: "MEDIUM", description: "Drainage networks under moderate load", category: "secondary" },
      { threshold: 0.8, type: "TRAFFIC", severity: "HIGH", description: "Traffic severely impacted by waterlogging", category: "downstream" },
    ]
  },
  URBAN_FLOOD: {
    id: "URBAN_FLOOD",
    name: "Urban Flood",
    description: "Severe flooding inundating critical infrastructure and halting traffic.",
    targetModifiers: {
      trafficFriction: 0.80,        // +80% congestion (near halt)
      waterLevelMultiplier: 3.5,    // +350% water levels
      drainageLoad: 1.20,           // 120% drainage load (overflow)
      floodRiskMultiplier: 2.0,     // +200% flood risk
      aqiMultiplier: -0.40,         // -40% AQI
      pm25Multiplier: -0.60,
      rainfallMultiplier: 8.0,
      noiseMultiplier: 0.40,
      temperatureShift: -2.0,
      powerGridAvailability: 0.70,  // 30% power outage risk due to flooding
      emergencyDemandMultiplier: 1.00 // +100% emergency demand
    },
    events: [
      { threshold: 0.3, type: "WATER", severity: "HIGH", description: "Severe urban flooding detected", category: "primary" },
      { threshold: 0.6, type: "TRAFFIC", severity: "CRITICAL", description: "Major roads impassable due to flooding", category: "secondary" },
      { threshold: 0.9, type: "EMERGENCY", severity: "CRITICAL", description: "Emergency response times severely degraded", category: "downstream" },
    ]
  },
  MAJOR_TRAFFIC_ACCIDENT: {
    id: "MAJOR_TRAFFIC_ACCIDENT",
    name: "Major Traffic Accident",
    description: "A major collision on a key arterial route causing massive tailbacks.",
    targetModifiers: {
      trafficFriction: 0.70,        // +70% congestion near the incident
      noiseMultiplier: 0.50,        // Sirens and horns
      pm25Multiplier: 0.30,         // Idling emissions
      emergencyDemandMultiplier: 0.40 // +40% emergency demand
    },
    events: [
      { threshold: 0.1, type: "TRAFFIC", severity: "HIGH", description: "Major traffic collision reported", category: "primary" },
      { threshold: 0.5, type: "EMERGENCY", severity: "HIGH", description: "Emergency units dispatched to collision site", category: "secondary" },
      { threshold: 0.8, type: "TRAFFIC", severity: "MEDIUM", description: "Secondary congestion spreading to adjacent zones", category: "downstream" },
    ]
  },
  POWER_OUTAGE: {
    id: "POWER_OUTAGE",
    name: "Power Outage",
    description: "Grid failure impacting streetlights and traffic signals.",
    targetModifiers: {
      trafficFriction: 0.35,        // +35% congestion due to signal failures
      noiseMultiplier: -0.20,       // Less activity
      powerGridAvailability: 0.0,   // 100% power loss
      emergencyDemandMultiplier: 0.20 // +20% emergency demand (elevators, etc.)
    },
    events: [
      { threshold: 0.1, type: "ENERGY", severity: "CRITICAL", description: "Massive power grid failure detected", category: "primary" },
      { threshold: 0.4, type: "STREETLIGHT", severity: "HIGH", description: "Streetlights and traffic signals offline", category: "secondary" },
      { threshold: 0.7, type: "TRAFFIC", severity: "MEDIUM", description: "Traffic flow degraded due to offline signals", category: "downstream" },
    ]
  },
  WATER_PIPELINE_FAILURE: {
    id: "WATER_PIPELINE_FAILURE",
    name: "Water Pipeline Failure",
    description: "Main pipeline burst causing localized flooding and water loss.",
    targetModifiers: {
      waterLevelMultiplier: 1.2,    // +120% localized water level
      floodRiskMultiplier: 0.5,
      noiseMultiplier: 0.10,
      trafficFriction: 0.25         // +25% congestion near burst
    },
    events: [
      { threshold: 0.1, type: "WATER", severity: "CRITICAL", description: "Primary water pipeline failure detected", category: "primary" },
      { threshold: 0.5, type: "WATER", severity: "HIGH", description: "Localized surface flooding occurring", category: "secondary" },
      { threshold: 0.8, type: "TRAFFIC", severity: "MEDIUM", description: "Traffic diverted around pipeline burst", category: "downstream" },
    ]
  },
  LARGE_PUBLIC_EVENT: {
    id: "LARGE_PUBLIC_EVENT",
    name: "Large Public Event",
    description: "Festival or rally increasing crowd density, waste, and traffic.",
    targetModifiers: {
      trafficFriction: 0.40,
      noiseMultiplier: 0.80,        // Loud crowds and music
      pm25Multiplier: 0.20,         // Dust and cooking
      wasteGenerationMultiplier: 1.5, // +150% waste generation
      emergencyDemandMultiplier: 0.20
    },
    events: [
      { threshold: 0.2, type: "CITIZEN", severity: "INFO", description: "Large public event commencing", category: "primary" },
      { threshold: 0.6, type: "TRAFFIC", severity: "MEDIUM", description: "Heavy congestion around event venue", category: "secondary" },
      { threshold: 0.9, type: "WASTE", severity: "HIGH", description: "Waste bins reaching capacity at venue", category: "downstream" },
    ]
  },
  EXTREME_HEAT: {
    id: "EXTREME_HEAT",
    name: "Extreme Heat",
    description: "Heatwave increasing power demand and health risks.",
    targetModifiers: {
      temperatureShift: 8.0,        // +8 degrees
      powerGridAvailability: 0.80,  // 20% degradation due to load
      emergencyDemandMultiplier: 0.50, // +50% medical emergencies
      aqiMultiplier: 0.20,          // +20% worse air quality (stagnant air)
      pm25Multiplier: 0.30,         // Higher PM2.5 retention
      noiseMultiplier: 0.0          // Unchanged
    },
    events: [
      { threshold: 0.3, type: "ENVIRONMENT", severity: "HIGH", description: "Extreme heatwave warning issued", category: "primary" },
      { threshold: 0.6, type: "ENERGY", severity: "MEDIUM", description: "Power grid under heavy load from cooling", category: "secondary" },
      { threshold: 0.9, type: "EMERGENCY", severity: "HIGH", description: "Spike in heat-related medical emergencies", category: "downstream" },
    ]
  },
  MULTI_INCIDENT: {
    id: "MULTI_INCIDENT",
    name: "Multi-Incident Crisis",
    description: "Compounding crises stressing all city services simultaneously.",
    targetModifiers: {
      trafficFriction: 0.60,
      waterLevelMultiplier: 1.0,
      powerGridAvailability: 0.50,
      emergencyDemandMultiplier: 1.20,
      noiseMultiplier: 0.50,
      pm25Multiplier: 0.40
    },
    events: [
      { threshold: 0.2, type: "SYSTEM", severity: "CRITICAL", description: "Multiple simultaneous crises detected", category: "primary" },
      { threshold: 0.5, type: "EMERGENCY", severity: "CRITICAL", description: "Emergency services overwhelmed", category: "secondary" },
    ]
  },
  RECOVERY_MODE: {
    id: "RECOVERY_MODE",
    name: "Recovery Mode",
    description: "Accelerated recovery from a previous crisis.",
    targetModifiers: {
      trafficFriction: -0.20,       // -20% (better than normal to clear backlog)
      waterLevelMultiplier: -0.50,  // active pumping
      drainageLoad: -0.50,
      powerGridAvailability: 1.0,
      pm25Multiplier: -0.20,        // Settling dust
      noiseMultiplier: 0.0,
      emergencyDemandMultiplier: -0.20
    },
    events: [
      { threshold: 0.1, type: "SYSTEM", severity: "INFO", description: "City entering recovery phase", category: "primary" },
      { threshold: 0.8, type: "SYSTEM", severity: "NORMAL", description: "Operations returning to normal baselines", category: "downstream" }
    ]
  }
};

export const BASELINE_MODIFIERS: CausalModifiers = {
  trafficFriction: 0.0,
  waterLevelMultiplier: 0.0,
  drainageLoad: 0.0,
  floodRiskMultiplier: 0.0,
  aqiMultiplier: 0.0,
  temperatureShift: 0.0,
  pm25Multiplier: 0.0,
  rainfallMultiplier: 0.0,
  noiseMultiplier: 0.0,
  powerGridAvailability: 1.0,
  wasteGenerationMultiplier: 0.0,
  emergencyDemandMultiplier: 0.0
};
