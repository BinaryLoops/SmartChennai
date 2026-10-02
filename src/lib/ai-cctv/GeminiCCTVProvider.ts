import { GoogleGenAI } from "@google/genai";
import { CCTV_LOCAL_REGISTRY } from "@/lib/ai-video/registry";
import { CCTVAnalysisSchema, CCTVAnalysisResult } from "./types";
import path from "path";

const fileCache = new Map<string, any>(); // Map local file path -> Gemini File object
const activeUploads = new Map<string, Promise<any>>(); // In-flight uploads

// Basic Semaphore for bounded concurrency
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.permits++;
    }
  }
}

// Bounded concurrency (max 2)
const concurrencyLimit = new Semaphore(parseInt(process.env.MAX_CONCURRENT_CCTV_ANALYSIS || "2", 10));

export class GeminiCCTVProvider {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private async getOrUploadFile(localFilePath: string): Promise<any> {
    const absolutePath = path.join(process.cwd(), "public", localFilePath);
    
    // Check cache
    const cached = fileCache.get(localFilePath);
    if (cached) {
      // Very basic check if file still exists in Gemini's view (state ACTIVE)
      try {
        const fileInfo = await this.ai.files.get({ name: cached.name });
        if (fileInfo.state === "ACTIVE") {
          return fileInfo;
        } else if (fileInfo.state === "PROCESSING") {
          // Wait for processing
          let current = fileInfo;
          let attempts = 0;
          while (current.state === "PROCESSING" && attempts < 10) {
            await new Promise((r) => setTimeout(r, 3000));
            current = await this.ai.files.get({ name: cached.name });
            attempts++;
          }
          if (current.state === "ACTIVE") return current;
        }
      } catch (err) {
        console.log(`[GeminiCCTVProvider] File ${cached.name} expired or missing. Re-uploading.`);
        fileCache.delete(localFilePath);
      }
    }

    // In-flight coalescing
    if (activeUploads.has(localFilePath)) {
      return activeUploads.get(localFilePath);
    }

    const uploadPromise = (async () => {
      try {
        console.log(`[GeminiCCTVProvider] Uploading ${localFilePath}...`);
        const fileResult = await this.ai.files.upload({
          file: absolutePath,
          mimeType: "video/mp4",
        });

        // Poll until ACTIVE
        let current = fileResult;
        while (current.state === "PROCESSING") {
          await new Promise((r) => setTimeout(r, 2000));
          current = await this.ai.files.get({ name: fileResult.name });
        }

        if (current.state === "FAILED") {
          throw new Error("File processing failed.");
        }

        fileCache.set(localFilePath, current);
        return current;
      } finally {
        activeUploads.delete(localFilePath);
      }
    })();

    activeUploads.set(localFilePath, uploadPromise);
    return uploadPromise;
  }

  async analyzeCamera(
    cameraId: string,
    simulatedTelemetry: {
      vehiclesPerHour: number;
      congestionPercent: number;
      speed: number;
    },
    context: {
      junctionName: string;
      zoneName: string;
    }
  ): Promise<CCTVAnalysisResult> {
    await concurrencyLimit.acquire();

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      // 1. Resolve local video
      let playlist = CCTV_LOCAL_REGISTRY[cameraId];
      if (!playlist || playlist.length === 0) {
        // Deterministic fallback
        const hash = cameraId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const videoId = (hash % 8) + 1;
        playlist = [`/cctv/video${videoId}.mp4`];
      }
      // For analysis, we just take the first video in the playlist as the representative segment
      const targetVideo = playlist[0];

      // 2. Get/Upload file to Gemini
      const geminiFile = await this.getOrUploadFile(targetVideo);

      // 3. Prepare Prompt
      const prompt = `You are a CCTV traffic observation system. Analyze this 15-30 second video segment.
Analyze ONLY visible evidence. Do NOT invent vehicles or events. Use estimates/ranges where appropriate.
If visibility is poor, reflect that in your confidence score.

CONTEXT:
Camera: ${cameraId}
Location: ${context.junctionName}, Zone: ${context.zoneName}
Simulated Telemetry (For correlation): Traffic ~${simulatedTelemetry.vehiclesPerHour} vph, Congestion ~${simulatedTelemetry.congestionPercent}%, Speed ~${Math.round(simulatedTelemetry.speed)}km/h.

Return structured JSON exactly matching the requested Zod schema.`;

      // 4. Generate Content
      const model = process.env.GEMINI_CCTV_MODEL || "gemini-3.8-flash";
      const response = await this.ai.models.generateContent({
        model,
        contents: [
          {
            fileData: {
              fileUri: geminiFile.uri,
              mimeType: geminiFile.mimeType,
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // low temp for analytical task
        }
      });

      let responseText = response.text();
      if (!responseText) {
        throw new Error("Empty response from Gemini.");
      }

      // Strip markdown code blocks if present
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

      const rawJson = JSON.parse(responseText);
      
      // Override cameraId and duration internally to ensure it matches
      rawJson.cameraId = cameraId;
      rawJson.durationSeconds = 15; // default estimate for typical MP4 segments

      // 5. Strict Zod Validation
      const validated = CCTVAnalysisSchema.parse(rawJson);
      
      return validated;
    } finally {
      concurrencyLimit.release();
    }
  }
}
