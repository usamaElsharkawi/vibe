import { createGoogle } from "@ai-sdk/google";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { Provider } from "../router/provider-registry";

export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export function isGeminiConfigured(): boolean {
  return typeof GOOGLE_API_KEY === "string" && GOOGLE_API_KEY.trim().length > 0;
}

function createGoogleProviderInstance() {
  return createGoogle({
    apiKey: GOOGLE_API_KEY,
    name: "google.generative-ai",
  });
}

export const googleProvider: Provider = {
  name: "google",
  isConfigured: () => isGeminiConfigured(),
  createModel: (modelId?: string) => {
    if (!isGeminiConfigured()) return null;
    const inst = createGoogleProviderInstance();
    // modelId may be a specific Gemini model ID; default to GEMINI_DEFAULT_MODEL
    return inst.chat((modelId as string) || GEMINI_DEFAULT_MODEL);
  },
};

// Backwards-compat helper functions (kept so external callers don't break)
export function createGeminiModel(): LanguageModelV4 | null {
  return googleProvider.createModel(GEMINI_DEFAULT_MODEL);
}
