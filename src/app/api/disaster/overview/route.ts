import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCENARIO_DEFINITIONS } from "../../../../../worker/scenarios/definitions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // We fetch global settings to see active scenario
    const settings = await prisma.simulationSetting.findUnique({
      where: { key: "global" }
    });

    const scenarioId = settings?.scenarioMode || "NORMAL_DAY";
    const definition = SCENARIO_DEFINITIONS[scenarioId];

    // Get zones to simulate affected areas based on modifiers
    const zones = await prisma.zone.findMany();
    
    let activeScenarios = [];
    if (scenarioId !== "NORMAL_DAY" && definition) {
      activeScenarios.push({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        modifiers: definition.targetModifiers,
        affectedZones: zones.slice(0, 3).map(z => z.id), // Simulate localized impact for first 3 zones
        startedAt: new Date().toISOString(), // Mock start time
      });
    }

    return NextResponse.json({
      activeScenarios,
      overallSeverity: scenarioId === "NORMAL_DAY" ? "NORMAL" : "HIGH",
      totalZonesAffected: activeScenarios.length > 0 ? 3 : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[GET /api/disaster/overview] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
