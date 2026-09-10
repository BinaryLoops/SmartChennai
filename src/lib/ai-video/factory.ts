import { AIVideoProvider } from "./types";
import { LumaProvider } from "./providers/luma";
import { MockProvider } from "./providers/mock";

let providerInstance: AIVideoProvider | null = null;

export function getAIVideoProvider(): AIVideoProvider {
  if (providerInstance) return providerInstance;

  const providerName = process.env.AI_VIDEO_PROVIDER?.toLowerCase() || "mock";

  switch (providerName) {
    case "luma":
      providerInstance = new LumaProvider();
      break;
    case "mock":
    default:
      providerInstance = new MockProvider();
      break;
  }

  return providerInstance;
}
