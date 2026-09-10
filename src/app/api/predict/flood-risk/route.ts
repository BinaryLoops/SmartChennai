import { NextResponse } from "next/server";
import { getFloodRiskPrediction } from "@/lib/predictive";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { zoneId, currentWaterLevel, rainfall = 0 } = body;
    
    const prediction = await getFloodRiskPrediction(zoneId, currentWaterLevel, rainfall);
    if (!prediction) {
      return NextResponse.json({ error: "Prediction service unavailable" }, { status: 503 });
    }
    
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
