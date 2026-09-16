"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  TrafficUpdatePayload,
  WaterUpdatePayload,
  IncidentPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  CityEventPayload,
  CityHealthPayload,
  TelemetryReading,
  ScenarioStatePayload,
} from "@packages/types";
import { SOCKET_EVENTS } from "@packages/types";

export interface CongestionPoint {
  timestamp: string;
  avgCongestion: number;
}

export interface SocketState {
  connected: boolean;
  trafficByJunction: Map<string, TrafficUpdatePayload>;
  waterBySensor: Map<string, WaterUpdatePayload>;
  incidents: IncidentPayload[];
  latestIncident: IncidentPayload | null;
  congestionHistory: CongestionPoint[];
  avgCongestion: number;
  activeIncidents: number;
  floodAlerts: number;

  // STAR ADD-ON #2
  cityEvents: CityEventPayload[];
  cityHealth: CityHealthPayload | null;
  telemetry: Map<string, TelemetryReading>;

  // STAR ADD-ON #3
  scenarioState: ScenarioStatePayload | null;

  emit: (event: string, payload: any, ack?: (res: any) => void) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:4001";
const MAX_HISTORY_POINTS = 720; // 1 hour at 5s intervals
const MAX_INCIDENTS = 50;

// Global singleton state for socket and its data
let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let subscribers = new Set<() => void>();

let globalState = {
  connected: false,
  trafficByJunction: new Map<string, TrafficUpdatePayload>(),
  waterBySensor: new Map<string, WaterUpdatePayload>(),
  incidents: [] as IncidentPayload[],
  latestIncident: null as IncidentPayload | null,
  congestionHistory: [] as CongestionPoint[],
  avgCongestion: 0,
  activeIncidents: 0,
  floodAlerts: 0,

  // STAR ADD-ON #2
  cityEvents: [] as CityEventPayload[],
  cityHealth: null as CityHealthPayload | null,
  telemetry: new Map<string, TelemetryReading>(),

  // STAR ADD-ON #3
  scenarioState: null as ScenarioStatePayload | null,
};

function notifySubscribers() {
  subscribers.forEach((sub) => sub());
}

function computeAvgCongestion() {
  const entries = Array.from(globalState.trafficByJunction.values());
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, t) => acc + t.congestionLevel, 0);
  return Math.round((sum / entries.length) * 100);
}

function computeFloodAlerts() {
  return Array.from(globalState.waterBySensor.values()).filter(
    (w) => w.riskLevel !== "normal"
  ).length;
}

function initSocket() {
  if (globalSocket) return globalSocket;

  globalSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  globalSocket.on("connect", () => {
    globalState = { ...globalState, connected: true };
    console.log("[useSocket] connected to worker");
    notifySubscribers();
  });

  globalSocket.on("disconnect", () => {
    globalState = { ...globalState, connected: false };
    console.log("[useSocket] disconnected from worker");
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.trafficUpdate, (payload: TrafficUpdatePayload) => {
    globalState.trafficByJunction.set(payload.junctionId, payload);
    const history = globalState.congestionHistory;
    const lastTs = history.length > 0 ? history[history.length - 1].timestamp : "";
    if (payload.timestamp !== lastTs) {
      const avgCong = computeAvgCongestion();
      history.push({ timestamp: payload.timestamp, avgCongestion: avgCong });
      if (history.length > MAX_HISTORY_POINTS) {
        history.splice(0, history.length - MAX_HISTORY_POINTS);
      }
    }
    globalState = {
      ...globalState,
      trafficByJunction: new Map(globalState.trafficByJunction),
      congestionHistory: [...history],
      avgCongestion: computeAvgCongestion(),
    };
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.waterUpdate, (payload: WaterUpdatePayload) => {
    globalState.waterBySensor.set(payload.sensorId, payload);
    globalState = {
      ...globalState,
      waterBySensor: new Map(globalState.waterBySensor),
      floodAlerts: computeFloodAlerts(),
    };
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.incidentNew, (payload: IncidentPayload) => {
    const updatedIncidents = [payload, ...globalState.incidents].slice(0, MAX_INCIDENTS);
    globalState = {
      ...globalState,
      incidents: updatedIncidents,
      latestIncident: payload,
      activeIncidents: updatedIncidents.filter((i) => i.status === "reported").length,
    };
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.incidentUpdated, (payload: IncidentPayload) => {
    const idx = globalState.incidents.findIndex((i) => i.id === payload.id);
    let updatedIncidents = [...globalState.incidents];
    if (idx >= 0) {
      updatedIncidents[idx] = { ...updatedIncidents[idx], ...payload };
    } else {
      updatedIncidents = [payload, ...updatedIncidents].slice(0, MAX_INCIDENTS);
    }
    globalState = {
      ...globalState,
      incidents: updatedIncidents,
      latestIncident: payload,
      activeIncidents: updatedIncidents.filter((i) => i.status === "reported").length,
    };
    notifySubscribers();
  });

  // STAR ADD-ON #2
  globalSocket.on(SOCKET_EVENTS.cityEventNew, (payload: CityEventPayload) => {
    const updatedEvents = [payload, ...globalState.cityEvents].slice(0, 50);
    globalState = {
      ...globalState,
      cityEvents: updatedEvents,
    };
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.cityHealthUpdate, (payload: CityHealthPayload) => {
    globalState = {
      ...globalState,
      cityHealth: payload,
    };
    notifySubscribers();
  });

  globalSocket.on(SOCKET_EVENTS.telemetryUpdate, (payloads: TelemetryReading[]) => {
    const newTelemetry = new Map(globalState.telemetry);
    for (const p of payloads) {
      newTelemetry.set(`${p.assetId}_${p.metric}`, p);
    }
    globalState = {
      ...globalState,
      telemetry: newTelemetry,
    };
    notifySubscribers();
  });

  // STAR ADD-ON #3
  globalSocket.on(SOCKET_EVENTS.scenarioStateUpdate, (payload: ScenarioStatePayload) => {
    globalState = {
      ...globalState,
      scenarioState: payload,
    };
    notifySubscribers();
  });

  return globalSocket;
}

export function useSocket() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    initSocket();
    
    const updateState = () => setState(globalState);
    subscribers.add(updateState);
    
    return () => {
      subscribers.delete(updateState);
      // We don't disconnect the global socket if other subscribers exist, 
      // but for simplicity in a demo we can just keep it alive indefinitely.
    };
  }, []);

  const emit = useCallback((event: any, payload: any, ack?: (res: any) => void) => {
    if (globalSocket) {
      globalSocket.emit(event, payload, ack as any);
    }
  }, []);



  return { ...state, emit } as SocketState;
}
