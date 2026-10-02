import { GeminiCCTVProvider } from "./GeminiCCTVProvider";

let cctvAnalysisProviderInstance: GeminiCCTVProvider | null = null;

export function getCCTVAnalysisProvider(): GeminiCCTVProvider {
  if (!cctvAnalysisProviderInstance) {
    cctvAnalysisProviderInstance = new GeminiCCTVProvider();
  }
  return cctvAnalysisProviderInstance;
}
