import { createGoogle } from "@ai-sdk/google";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { GEMINI_MODELS } from "../constants/models";

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
  name: PROVIDERS.GOOGLE,
  isConfigured: () => isGeminiConfigured(),
  getModel: () => {
    if (!isGeminiConfigured()) return null;
    const inst = createGoogleProviderInstance();
    return {
      model: inst.chat(GEMINI_MODELS.DEFAULT),
      modelId: GEMINI_MODELS.DEFAULT,
    };
  },
};

// Backwards-compat helper function kept so external callers don't break.
export function createGeminiModel() {
  return googleProvider.getModel()?.model ?? null;
}
