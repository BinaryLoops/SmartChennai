import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const INCIDENTS_QUEUE_NAME = "incidents";

export interface IncidentJobData {
  referenceId: string;
  type: "traffic" | "fire" | "medical" | "flood";
  lat: number;
  lng: number;
  severity?: number;
  source?: "citizen" | "sensor" | "department";
  description?: string;
  clientIp?: string;
  submittedAt: string;
}

export interface IncidentJobResult {
  status: "created" | "merged";
  incidentId: string;
  referenceId?: string;
  reportedBy: number;
  priorityScore: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __incidentQueue: Queue<IncidentJobData, IncidentJobResult> | undefined;
}

export function getIncidentQueue(): Queue<IncidentJobData, IncidentJobResult> {
  if (process.env.NODE_ENV === "production") {
    return new Queue<IncidentJobData, IncidentJobResult>(INCIDENTS_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600 * 24, // keep for 24h
          count: 5000,
        },
        removeOnFail: {
          age: 3600 * 48, // keep for 48h
          count: 2000,
        },
      },
    });
  }

  if (!global.__incidentQueue) {
    global.__incidentQueue = new Queue<IncidentJobData, IncidentJobResult>(
      INCIDENTS_QUEUE_NAME,
      {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: {
            count: 2000,
          },
          removeOnFail: {
            count: 1000,
          },
        },
      }
    );
  }

  return global.__incidentQueue;
}

export const incidentQueue = getIncidentQueue();
