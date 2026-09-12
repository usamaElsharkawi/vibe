import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENROUTER_FALLBACK_MODELS } from "../constants/models";
import { fetchAndRankFreeModels } from "../utils/openrouter-model-fetcher";

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

/**
 * Get dynamically ranked free models or fall back to hardcoded list
 */
async function getModelFallbackChain(): Promise<string[]> {
  try {
    // Attempt to fetch and rank free models dynamically
    const rankedModels = await fetchAndRankFreeModels();
    
    if (rankedModels.length > 0) {
      console.log(
        `[OpenRouter] Using ${rankedModels.length} dynamically ranked free models`
      );
      return rankedModels.map((m) => m.id);
    }
  } catch (error) {
    console.warn(
      "[OpenRouter] Dynamic model fetching failed, using hardcoded fallback:",
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Fallback to hardcoded list if dynamic fetch fails
  console.log("[OpenRouter] Using hardcoded fallback model list");
  return Array.from(OPENROUTER_FALLBACK_MODELS);
}

export const openrouterProvider: Provider = {
  name: PROVIDERS.OPENROUTER,
  isConfigured: () => isOpenRouterConfigured(),
  getModel: async () => {
    if (!isOpenRouterConfigured()) return null;

    const inst = createOpenRouterProviderInstance();
    if (!inst) return null;

    // Get the model fallback chain (either dynamic or hardcoded)
    const modelChain = await getModelFallbackChain();

    // Try each model in the fallback chain
    // The first model that successfully initializes will be returned
    for (const modelId of modelChain) {
      try {
        const model = inst.chat(modelId);
        // Successfully created the model instance
        console.log(`[OpenRouter] Successfully using model: ${modelId}`);
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
