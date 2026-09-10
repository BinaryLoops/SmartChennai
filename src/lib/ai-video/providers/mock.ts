import { AIGenerationContext, AIVideoProvider, GeneratedVideoSegment } from "../types";

export class MockProvider implements AIVideoProvider {
  name = "mock";
  private testMp4Url: string | undefined;

  constructor() {
    this.testMp4Url = process.env.AI_VIDEO_MOCK_TEST_MP4;
  }

  async generateSegment(context: AIGenerationContext, referenceImageUrl?: string): Promise<string> {
    if (!this.testMp4Url) {
      throw new Error("AI VIDEO PROVIDER NOT CONFIGURED");
    }
    
    // Simulate generation job submission
    const jobId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return jobId;
  }

  async checkStatus(jobId: string): Promise<GeneratedVideoSegment> {
    if (!this.testMp4Url) {
      return { id: jobId, isMock: true, status: "failed", errorReason: "AI VIDEO PROVIDER NOT CONFIGURED" };
    }

    const age = Date.now() - parseInt(jobId.split("-")[1] || "0");
    
    // Simulate realistic queue/generation delay (15 seconds for mock)
    if (age < 15000) {
      return { id: jobId, isMock: true, status: "processing" };
    }

    return {
      id: jobId,
      url: this.testMp4Url,
      isMock: true,
      status: "completed",
    };
  }
}
