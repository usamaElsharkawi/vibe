import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { Provider } from "../router/provider-registry";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;

export function isOpenRouterConfigured(): boolean {
  return typeof OPENROUTER_API_KEY === "string" && OPENROUTER_API_KEY.trim().length > 0;
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
  name: "openrouter",
  isConfigured: () => isOpenRouterConfigured(),
  createModel: (modelId?: string) => {
    const inst = createOpenRouterProviderInstance();
    if (!inst) return null;
    // modelId is expected to be a model string from policy preferences
    return inst.chat((modelId as string) || "qwen-7b");
  },
};

// Backwards-compat helper kept for external callers
export function createOpenRouterModel(modelId: string): LanguageModelV4 | null {
  return openrouterProvider.createModel(modelId);
}
