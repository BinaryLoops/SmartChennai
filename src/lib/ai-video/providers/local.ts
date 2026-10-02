import { AIVideoProvider, AIGenerationContext, GeneratedVideoSegment } from "../types";
import { CCTV_LOCAL_REGISTRY } from "../registry";

// In-memory state to track playlist position for each camera
const cameraIndices = new Map<string, number>();

// In-memory state to map a generated jobId to a specific video URL
const activeJobs = new Map<string, string>();

export class LocalProvider implements AIVideoProvider {
  name = "local";

  async generateSegment(context: AIGenerationContext): Promise<string> {
    let playlist = CCTV_LOCAL_REGISTRY[context.cameraId];
    
    if (!playlist || playlist.length === 0) {
      // Deterministic fallback: hash the cameraId to select one of the 8 videos
      // This ensures the same camera always gets the same fallback video
      const hash = context.cameraId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      // We have 8 fallback videos
      const videoId = (hash % 8) + 1;
      playlist = [`/cctv/video${videoId}.mp4`];
    }

    // Get current index for this camera, default to 0
    let currentIndex = cameraIndices.get(context.cameraId) || 0;
    
    const videoUrl = playlist[currentIndex];

    // Advance playlist for NEXT time a segment is requested
    currentIndex = (currentIndex + 1) % playlist.length;
    cameraIndices.set(context.cameraId, currentIndex);

    // Create a unique job ID
    const jobId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Store the selected video URL for this job
    activeJobs.set(jobId, videoUrl);

    return jobId;
  }

  async checkStatus(jobId: string): Promise<GeneratedVideoSegment> {
    const videoUrl = activeJobs.get(jobId);
    
    if (!videoUrl) {
      return {
        id: jobId,
        isMock: true,
        status: "failed",
        errorReason: "Job not found in local registry",
      };
    }

    return {
      id: jobId,
      url: videoUrl,
      isMock: true, // UI can use this to adapt labels
      status: "completed",
    };
  }
}
