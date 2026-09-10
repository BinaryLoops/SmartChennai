import { useState, useEffect, useCallback, useRef } from "react";
import type { AIGenerationContext } from "@/lib/ai-video/types";

interface UseAIVideoQueueProps {
  cameraId: string;
  locationName: string;
  isVisible: boolean;
  context: Omit<AIGenerationContext, "cameraId" | "locationName">;
}

export function useAIVideoQueue({ cameraId, locationName, isVisible, context }: UseAIVideoQueueProps) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [readyBuffer, setReadyBuffer] = useState<string[]>([]);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Use refs for the polling loop to always have fresh context without re-triggering effects
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const activeJobs = useRef<Set<string>>(new Set());

  const generateSegment = useCallback(async () => {
    try {
      setGeneratingCount((c) => c + 1);
      setError(null);

      // Submit job
      const res = await fetch("/api/cctv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraId,
          locationName,
          ...contextRef.current,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate video");
      }

      const jobId = data.jobId;
      activeJobs.current.add(jobId);

      // Poll status
      let attempts = 0;
      while (activeJobs.current.has(jobId)) {
        attempts++;
        if (attempts > 120) throw new Error("Generation timeout"); // 6 minutes max

        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const statusRes = await fetch(`/api/cctv/status?jobId=${jobId}`);
        const statusData = await statusRes.json();

        if (!statusRes.ok || statusData.status === "failed") {
          throw new Error(statusData.errorReason || "Generation failed");
        }

        if (statusData.status === "completed" && statusData.url) {
          activeJobs.current.delete(jobId);
          setReadyBuffer((prev) => [...prev, statusData.url]);
          setGeneratingCount((c) => Math.max(0, c - 1));
          return;
        }
      }
    } catch (err: any) {
      console.error(`[AIVideoQueue] Generation failed for ${cameraId}:`, err);
      setError(err.message);
      setGeneratingCount((c) => Math.max(0, c - 1));
    }
  }, [cameraId, locationName]);

  // Manager loop
  useEffect(() => {
    if (!isVisible) return; // Save cost by not generating when not visible

    // If we have no playing URL but we have a ready buffer, immediately promote
    if (!playingUrl && readyBuffer.length > 0) {
      setPlayingUrl(readyBuffer[0]);
      setReadyBuffer((prev) => prev.slice(1));
      return;
    }

    // Target buffer size: 2 ready segments
    const targetBuffer = 2;
    const currentPipelineSize = readyBuffer.length + generatingCount;

    if (currentPipelineSize < targetBuffer && generatingCount < 1) { // Max 1 concurrent job per camera
      generateSegment();
    }
  }, [isVisible, playingUrl, readyBuffer.length, generatingCount, generateSegment]);

  const playNext = useCallback(() => {
    if (readyBuffer.length > 0) {
      setPlayingUrl(readyBuffer[0]);
      setReadyBuffer((prev) => prev.slice(1));
    } else {
      setPlayingUrl(null); // Wait for buffer
    }
  }, [readyBuffer]);

  return {
    playingUrl,
    readyCount: readyBuffer.length,
    isGenerating: generatingCount > 0,
    error,
    playNext,
  };
}
