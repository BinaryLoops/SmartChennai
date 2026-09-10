export interface AIGenerationContext {
  cameraId: string;
  locationName: string;
  congestion: number;
  vehiclesPerHour: number;
  incidentType?: string;
  incidentSeverity?: number;
}

export interface GeneratedVideoSegment {
  id: string;
  url?: string;
  isMock: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  errorReason?: string;
}

export interface AIVideoProvider {
  name: string;
  generateSegment(context: AIGenerationContext, referenceImageUrl?: string): Promise<string>;
  checkStatus(jobId: string): Promise<GeneratedVideoSegment>;
}
