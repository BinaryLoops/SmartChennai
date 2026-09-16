import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { SCENARIO_DEFINITIONS, BASELINE_MODIFIERS } from "./definitions";
import { 
  ScenarioStatePayload, 
  ScenarioId, 
  CausalModifiers, 
  CausalHistoryEntry 
} from "../../packages/types/scenarios";
import { emitEventTransition } from "../event_fabric";
import { SOCKET_EVENTS } from "../../packages/types";

// Gradual onset speed per tick (approx 2 minutes to full onset at 5s ticks = ~24 ticks)
// At 1.0 multiplier, we want to reach 1.0 in ~24 ticks -> 1.0 / 24 = 0.04
const ONSET_RATE = 0.05; 
const DECAY_RATE = 0.02;

export class ScenarioEngine {
  private state: ScenarioStatePayload;
  private prisma: PrismaClient;
  private io: Server;
  
  // Keep track of which event thresholds have been fired for the current scenario
  private firedEvents = new Set<string>();

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
    this.state = {
      activeScenarioId: "NORMAL_DAY",
      status: "idle",
      startedAt: null,
      elapsedSeconds: 0,
      severity: 1.0,
      affectedZones: [],
      simulationSpeed: 1,
      currentModifiers: { ...BASELINE_MODIFIERS },
      history: []
    };
  }

  public getState(): ScenarioStatePayload {
    return this.state;
  }
  
  public getModifiers(): CausalModifiers {
    return this.state.currentModifiers;
  }

  public setCommand(command: { 
    action: "start" | "stop" | "pause" | "resume", 
    scenarioId?: ScenarioId, 
    severity?: number,
    affectedZones?: string[],
    simulationSpeed?: number 
  }) {
    if (command.action === "start" && command.scenarioId) {
      if (this.state.activeScenarioId !== command.scenarioId) {
        this.addHistory(command.scenarioId, `Scenario ${SCENARIO_DEFINITIONS[command.scenarioId].name} started`, "start");
        this.firedEvents.clear();
      }
      this.state.activeScenarioId = command.scenarioId;
      this.state.status = "active";
      this.state.startedAt = new Date().toISOString();
      this.state.elapsedSeconds = 0;
      if (command.severity !== undefined) this.state.severity = Math.max(0.1, Math.min(1.0, command.severity));
      if (command.affectedZones) this.state.affectedZones = command.affectedZones;
      if (command.simulationSpeed) this.state.simulationSpeed = command.simulationSpeed;
    } else if (command.action === "stop") {
      if (this.state.status === "active" || this.state.status === "pause") {
        this.state.status = "recovering";
        this.addHistory(this.state.activeScenarioId, `Scenario ${SCENARIO_DEFINITIONS[this.state.activeScenarioId].name} stopped. Entering recovery.`, "stop");
      }
    } else if (command.action === "pause") {
      if (this.state.status === "active") this.state.status = "pause";
    } else if (command.action === "resume") {
      if (this.state.status === "pause") this.state.status = "active";
    }
    
    // Broadcast state immediately on command
    this.io.emit(SOCKET_EVENTS.scenarioStateUpdate, this.state);
  }

  public async runCausalTick(tickDeltaMs: number) {
    try {
      if (this.state.status === "active" || this.state.status === "recovering") {
        if (this.state.status === "active") {
          this.state.elapsedSeconds += tickDeltaMs / 1000;
        }

        const def = SCENARIO_DEFINITIONS[this.state.activeScenarioId];
        const targetMods = this.state.status === "active" ? def.targetModifiers : {};
        const isRecovering = this.state.status === "recovering";

        // Track how close we are to the target (0.0 to 1.0) for event firing
        let totalProgress = 0;
        let trackedFields = 0;

        // Smoothly interpolate current modifiers towards target
        for (const key of Object.keys(BASELINE_MODIFIERS) as (keyof CausalModifiers)[]) {
          const current = this.state.currentModifiers[key] ?? 0;
          // If active, scale the target modifier by the severity. If recovering, target is baseline.
          const targetRaw = isRecovering ? (BASELINE_MODIFIERS[key] ?? 0) : (targetMods[key] ?? BASELINE_MODIFIERS[key] ?? 0);
          const target = isRecovering ? targetRaw : targetRaw * this.state.severity;
          
          if (Math.abs(current - target) > 0.001) {
            const rate = isRecovering ? DECAY_RATE : ONSET_RATE;
            // Move current towards target by rate
            const diff = target - current;
            const step = Math.sign(diff) * Math.min(Math.abs(diff), rate);
            this.state.currentModifiers[key] = current + step;
          } else {
            this.state.currentModifiers[key] = target;
          }

          // Calculate progress for events
          if (!isRecovering && Math.abs(target) > 0) {
            totalProgress += (current / target);
            trackedFields++;
          }
        }
        
        // Compute onset %
        const onsetProgress = trackedFields > 0 ? (totalProgress / trackedFields) : (this.state.elapsedSeconds > 10 ? 1 : 0);
        
        // Fire threshold events
        if (this.state.status === "active") {
           for (const evt of def.events) {
             const evtKey = `${def.id}-${evt.threshold}-${evt.type}`;
             if (!this.firedEvents.has(evtKey) && onsetProgress >= evt.threshold) {
               this.firedEvents.add(evtKey);
               
               // 1. Add to causal history
               this.addHistory(def.id, evt.description, "effect");
               
               // 2. Fire CityEvent via Event Fabric
               await emitEventTransition(this.prisma, this.io, {
                 type: evt.type,
                 severity: evt.severity as any,
                 description: evt.description,
                 source: "system",
                 confidence: 0.95,
                 metadata: { scenario: def.id, category: evt.category }
               });
             }
           }
        }

        // Check if recovery is complete
        if (isRecovering) {
          let allRecovered = true;
          for (const key of Object.keys(BASELINE_MODIFIERS) as (keyof CausalModifiers)[]) {
            if (Math.abs((this.state.currentModifiers[key] ?? 0) - (BASELINE_MODIFIERS[key] ?? 0)) > 0.01) {
              allRecovered = false;
              break;
            }
          }
          if (allRecovered) {
             this.state.status = "idle";
             this.state.activeScenarioId = "NORMAL_DAY";
             this.state.currentModifiers = { ...BASELINE_MODIFIERS };
             this.addHistory("NORMAL_DAY", "City operations returned to normal baselines.", "recovery");
             this.firedEvents.clear();
          }
        }

        // Emit updated state to frontend
        this.io.emit(SOCKET_EVENTS.scenarioStateUpdate, this.state);
      }
    } catch (err) {
      // Failure Isolation: Never crash the main worker if causal engine fails
      console.error("[Causal Engine] Tick failed. Isolating failure:", err);
    }
  }

  private addHistory(scenarioId: ScenarioId, message: string, type: CausalHistoryEntry["type"]) {
    const entry: CausalHistoryEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      scenarioId,
      message,
      type
    };
    this.state.history.unshift(entry);
    if (this.state.history.length > 20) {
      this.state.history.pop();
    }
  }
}
