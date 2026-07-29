import type { ModelPolicy } from "./index";

export const developmentPolicy: ModelPolicy = {
  name: "development",
  // Provider order is the canonical ordering the router should try.
  providerOrder: ["google", "openrouter"],
  // Model preferences are business rules and belong to policies, not providers.
  modelPreferences: {
    openrouter: ["qwen-7b", "deepseek-3b", "gemma-3-1b", "llama-2-7b"],
  },
};
