import { PrismaClient, CityEvent } from "@prisma/client";
import { Server } from "socket.io";
import { SOCKET_EVENTS, CityEventPayload } from "../packages/types";

// In-memory state tracking to prevent duplicate events
// Key: "assetId:type" -> Value: last known severity
const lastKnownSeverity = new Map<string, string>();

// For deduplicating general zone events if there is no specific asset
// Key: "zoneId:type" -> Value: last known severity
const lastKnownZoneSeverity = new Map<string, string>();

export async function emitEventTransition(
  prisma: PrismaClient,
  io: Server,
  payload: {
    type: string;
    severity: "NORMAL" | "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    assetId?: string;
    zoneId?: string;
    source?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }
) {
  const source = payload.source || "system";
  const { type, severity, description, assetId, zoneId, confidence, metadata } = payload;
  
  const cacheKey = assetId ? `${assetId}:${type}` : (zoneId ? `${zoneId}:${type}` : null);
  
  if (cacheKey) {
    const previous = lastKnownSeverity.get(cacheKey) || lastKnownZoneSeverity.get(cacheKey) || "NORMAL";

    if (previous === severity) {
      // Deduplication: State hasn't changed.
      return;
    }

    // State transition detected
    if (assetId) {
      lastKnownSeverity.set(cacheKey, severity);
    } else {
      lastKnownZoneSeverity.set(cacheKey, severity);
    }
    
    // Skip creating an event if the severity transitioned from one NORMAL state to another NORMAL state
    if (previous === "NORMAL" && severity === "INFO") {
      // Optional: info events might just be noise if they occur frequently. We'll allow them here.
    }
  }

  try {
    const cityEvent = await prisma.cityEvent.create({
      data: {
        type,
        severity,
        description,
        assetId,
        zoneId,
        source,
        status: severity === "INFO" || severity === "NORMAL" ? "resolved" : "active",
        confidence,
        metadata: metadata || {},
        timestamp: new Date()
      }
    });

    let zoneName: string | undefined = undefined;
    if (zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: zoneId }});
      zoneName = zone?.name;
    }

    const eventPayload: CityEventPayload = {
      id: cityEvent.id,
      type: cityEvent.type,
      severity: cityEvent.severity as any,
      description: cityEvent.description,
      assetId: cityEvent.assetId || undefined,
      zoneId: cityEvent.zoneId || undefined,
      zoneName: zoneName,
      source: cityEvent.source,
      status: cityEvent.status,
      confidence: cityEvent.confidence || undefined,
      metadata: cityEvent.metadata ? (cityEvent.metadata as Record<string, any>) : undefined,
      relatedIncidentId: cityEvent.relatedIncidentId || undefined,
      timestamp: cityEvent.timestamp.toISOString()
    };

    io.emit(SOCKET_EVENTS.cityEventNew, eventPayload);
  } catch (err) {
    console.error("[event-fabric] failed to emit event transition:", err);
  }
}
