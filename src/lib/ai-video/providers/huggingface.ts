import { HfInference } from "@huggingface/inference";
import { AIGenerationContext, AIVideoProvider, GeneratedVideoSegment } from "../types";
import { buildPrompt } from "../prompt";

export class HuggingFaceProvider implements AIVideoProvider {
  name = "huggingface";
  private token: string;
  private hf: HfInference;
  private model = "Wan-AI/Wan2.1-T2V-14B"; // Officially supported T2V model on HF Providers
  private inferenceProvider = "fal-ai";

  constructor() {
    this.token = process.env.HF_TOKEN || "";
    if (!this.token) {
      console.warn("HuggingFaceProvider initialized without HF_TOKEN");
    }
    // Initialize the official client. It won't throw until used if token is empty.
    this.hf = new HfInference(this.token);
  }

  async generateSegment(context: AIGenerationContext, referenceImageUrl?: string): Promise<string> {
    if (!this.token || this.token === "hf_xxxxxxxxxxxxxxxxx") {
      throw new Error("HF_TOKEN is invalid or missing for HuggingFace provider");
    }

    const prompt = buildPrompt(context);

    try {
      // Use the new Inference Providers API with the HfInference client
      const blob = await this.hf.textToVideo({
        model: this.model,
        provider: this.inferenceProvider as any,
        inputs: prompt,
      });

      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      
      const jobId = `hf-${Date.now()}`;
      
      // Store in memory for the status check (hack for serverless/demo environments)
      (global as any)[`hf_video_${jobId}`] = `data:video/mp4;base64,${base64}`;

      return jobId;
    } catch (error: any) {
      console.error("[HuggingFaceProvider] API Error:", error);
      // Check if it's an insufficient credits or unavailability error from the provider
      const errorMsg = error.message || String(error);
      if (errorMsg.toLowerCase().includes("insufficient") || errorMsg.toLowerCase().includes("credits") || errorMsg.toLowerCase().includes("balance")) {
        throw new Error(`Insufficient Hugging Face inference credits for provider '${this.inferenceProvider}' and model '${this.model}'`);
      }
      throw new Error(`HuggingFace API Error: ${errorMsg}`);
    }
  }

  async checkStatus(jobId: string): Promise<GeneratedVideoSegment> {
    const url = (global as any)[`hf_video_${jobId}`];
    
    if (!url) {
      return { id: jobId, isMock: false, status: "failed", errorReason: "Video data lost or generation failed." };
    }

    return {
      id: jobId,
      url,
      isMock: false,
      status: "completed",
    };
  }
}
