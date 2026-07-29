import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { Provider } from "../router/provider-registry";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
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
  name: "openai",
  isConfigured: () => isOpenAIConfigured(),
  createModel: (modelId?: string) => {
    const inst = createOpenAIProviderInstance();
    if (!inst) return null;
    // modelId may be provided by a policy; fall back to default
    return inst.chat((modelId as string) || OPENAI_DEFAULT_MODEL);
  },
};

// Backwards-compat helper
export function createOpenAIModel(): LanguageModelV4 | null {
  return openaiProvider.createModel(OPENAI_DEFAULT_MODEL);
}
