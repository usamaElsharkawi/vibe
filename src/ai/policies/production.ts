import type { ModelPolicy } from "./index";

export const productionPolicy: ModelPolicy = {
  name: "production",
  // Production prefers higher-quality (paid) providers first.
  providerOrder: ["openai", "openrouter", "google"],
  // Production still prefers a reasonable fallback model list for OpenRouter.
  modelPreferences: {
    openrouter: ["qwen-7b", "deepseek-3b", "gemma-3-1b", "llama-2-7b"],
  },
};
