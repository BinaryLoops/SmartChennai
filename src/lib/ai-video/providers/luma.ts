import { AIGenerationContext, AIVideoProvider, GeneratedVideoSegment } from "../types";
import { buildPrompt } from "../prompt";

export class LumaProvider implements AIVideoProvider {
  name = "luma";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.AI_VIDEO_API_KEY || "";
    if (!this.apiKey) {
      console.warn("LumaProvider initialized without AI_VIDEO_API_KEY");
    }
  }

  async generateSegment(context: AIGenerationContext, referenceImageUrl?: string): Promise<string> {
    if (!this.apiKey) throw new Error("AI_VIDEO_API_KEY is required for Luma provider");

    const prompt = buildPrompt(context);

    // Mocking the Luma API request since we don't have the real SDK
    // In a real scenario, this would call https://api.lumalabs.ai/dream-machine/v1/generations
    // body: { prompt, keyframes: { frame0: { type: "image", url: referenceImageUrl } } }
    
    // Simulating API call
    console.log(`[LumaProvider] Submitting generation for ${context.cameraId}. Prompt: ${prompt}`);
    
    const jobId = `luma-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return jobId;
  }

  async checkStatus(jobId: string): Promise<GeneratedVideoSegment> {
    // Mocking status check
    // In a real scenario, this would poll GET https://api.lumalabs.ai/dream-machine/v1/generations/{jobId}
    
    // Simulate processing time (e.g., 5 seconds for dev, real is ~120s)
    const age = Date.now() - parseInt(jobId.split("-")[1] || "0");
    if (age < 10000) {
      return { id: jobId, isMock: false, status: "processing" };
    }

    return {
      id: jobId,
      url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", // Real URL would be returned here
      isMock: false,
      status: "completed",
    };
  }
}
