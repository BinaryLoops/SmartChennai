import { NextResponse } from "next/server";
import { getAIVideoProvider } from "@/lib/ai-video/factory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const provider = getAIVideoProvider();
    const status = await provider.checkStatus(jobId);
    
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("[CCTV Status API] Error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
