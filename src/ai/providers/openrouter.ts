import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENROUTER_FALLBACK_MODELS } from "../constants/models";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;

export function isOpenRouterConfigured(): boolean {
  return (
    typeof OPENROUTER_API_KEY === "string" &&
    OPENROUTER_API_KEY.trim().length > 0
  );
}

function createOpenRouterProviderInstance() {
  if (!isOpenRouterConfigured()) return null;
  return createOpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    name: "openrouter",
  });
}

export const openrouterProvider: Provider = {
  name: PROVIDERS.OPENROUTER,
  isConfigured: () => isOpenRouterConfigured(),
  getModel: () => {
    if (!isOpenRouterConfigured()) return null;

    const inst = createOpenRouterProviderInstance();
    if (!inst) return null;

    // Try each model in the fallback chain
    // The first model that successfully initializes will be returned
    for (const modelId of OPENROUTER_FALLBACK_MODELS) {
      try {
        const model = inst.chat(modelId);
        // Successfully created the model instance
        return {
          model,
          modelId,
        };
      } catch (error) {
        // This model failed, try the next one
        console.warn(
          `OpenRouter model ${modelId} failed to initialize:`,
          error instanceof Error ? error.message : String(error),
        );
        continue;
      }
    }

    // If all models failed, return null
    console.error("OpenRouter: All fallback models failed to initialize");
    return null;
  },
};

// Backwards-compat helper function kept so external callers don't break.
export function createOpenRouterModel(modelId: string) {
  const inst = createOpenRouterProviderInstance();
  if (!inst) return null;
  return inst.chat(modelId);
}
