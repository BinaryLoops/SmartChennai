import { z } from "zod";

export const CCTVObservationSchema = z.object({
  timestampSeconds: z.number(),
  type: z.string(),
  severity: z.enum(["NORMAL", "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

export const CCTVAnalysisSchema = z.object({
  cameraId: z.string(),
  durationSeconds: z.number(),
  
  traffic: z.object({
    vehicleCountEstimate: z.number(),
    carCountEstimate: z.number(),
    motorcycleCountEstimate: z.number(),
    busCountEstimate: z.number(),
    truckCountEstimate: z.number(),
    trafficLevel: z.enum(["LOW", "MODERATE", "HIGH", "SEVERE"]),
    congestionPercentEstimate: z.number(),
    queueLengthEstimate: z.number(),
    trafficFlow: z.enum(["SMOOTH", "STOP_AND_GO", "STATIONARY", "UNKNOWN"]),
  }),

  pedestrians: z.object({
    detected: z.boolean(),
    countEstimate: z.number(),
  }),

  incidents: z.object({
    accidentSuspected: z.boolean(),
    stalledVehicle: z.boolean(),
    wrongWayMovement: z.boolean(),
    roadObstruction: z.boolean(),
    crowding: z.boolean(),
    smokeOrFire: z.boolean(),
    floodingVisible: z.boolean(),
  }),

  infrastructure: z.object({
    signalVisible: z.boolean(),
    signalState: z.enum(["RED", "YELLOW", "GREEN", "OFF", "UNKNOWN"]),
    laneBlocked: z.boolean(),
    roadCondition: z.enum(["CLEAR", "WET", "DAMAGED", "DEBRIS", "UNKNOWN"]),
  }),

  confidence: z.number().min(0).max(1),
  observations: z.array(CCTVObservationSchema),
});

export type CCTVAnalysisResult = z.infer<typeof CCTVAnalysisSchema>;
