import { NextResponse } from "next/server";
import { getAIVideoProvider } from "@/lib/ai-video/factory";
import { AIGenerationContext } from "@/lib/ai-video/types";

// Limit active cameras based on config
const ACTIVE_CAMERAS = (process.env.AI_VIDEO_MAX_ACTIVE_CAMERAS || "4");
const ENABLED = process.env.AI_VIDEO_ENABLED !== "false";

export async function POST(req: Request) {
  if (!ENABLED) {
    return NextResponse.json({ error: "AI_VIDEO_ENABLED is false" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const context: AIGenerationContext = {
      cameraId: body.cameraId,
      locationName: body.locationName,
      congestion: body.congestion,
      vehiclesPerHour: body.vehiclesPerHour,
      incidentType: body.incidentType,
      incidentSeverity: body.incidentSeverity,
    };

    if (!context.cameraId) {
      return NextResponse.json({ error: "Missing cameraId" }, { status: 400 });
    }

    const provider = getAIVideoProvider();
    
    // In a real application with strict cost controls, we would also validate 
    // against a Redis rate limiter (AI_VIDEO_DAILY_GENERATION_LIMIT) here.

    const jobId = await provider.generateSegment(context, body.referenceImageUrl);
    
    return NextResponse.json({ jobId, provider: provider.name });
  } catch (error: any) {
    console.error("[CCTV Generate API] Error:", error);
    const message = error.message === "AI VIDEO PROVIDER NOT CONFIGURED" 
      ? error.message 
      : "Failed to generate video segment";
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
