import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { TelemetryReading } from "../../packages/types";

export interface TelemetryContext {
  prisma: PrismaClient;
  io: Server;
  simulatedHour: number;
  speedMultiplier: number;
  isMonsoon: boolean;
  scenario: string;
  causalMods?: any;
}

export interface TelemetryGenerator {
  name: string;
  runTick: (ctx: TelemetryContext) => Promise<{
    readings: TelemetryReading[];
    healthScore: number | null; // 0-100 score for this domain, null if not applicable
  }>;
}
