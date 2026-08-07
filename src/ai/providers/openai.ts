import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENAI_MODELS } from "../constants/models";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function isOpenAIConfigured(): boolean {
  return typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.trim().length > 0;
}

function createOpenAIProviderInstance() {
  if (!isOpenAIConfigured()) return null;
  return createOpenAI({
    apiKey: OPENAI_API_KEY,
    name: "openai",
  });
}

export const openaiProvider: Provider = {
  name: PROVIDERS.OPENAI,
  isConfigured: () => isOpenAIConfigured(),
  getModel: () => {
    const inst = createOpenAIProviderInstance();
    if (!inst) return null;

    return {
      model: inst.chat(OPENAI_MODELS.DEFAULT),
      modelId: OPENAI_MODELS.DEFAULT,
    };
  },
};

// Backwards-compat helper function kept so external callers don't break.
export function createOpenAIModel() {
  return openaiProvider.getModel()?.model ?? null;
}
