// This becomes the public AI public API.

// Instead of importing deeply:

// import { codingAgent } from "@/ai/agent/coding-agent";

// everywhere else, export it from here so consumers can simply import from @/ai.

export { ModelRouter } from "./router/model-router";

// Keep provider helpers for backwards compatibility
export { createGeminiModel, isGeminiConfigured, googleProvider } from "./providers/google";
export { createOpenRouterModel, isOpenRouterConfigured, openrouterProvider } from "./providers/openrouter";
export { createOpenAIModel, isOpenAIConfigured, openaiProvider } from "./providers/openai";

// Also export registry helpers and built-in provider registration for bootstrap.
export {
  registerBuiltInProviders,
  registerProvider,
  registerProvider as registerProviders,
} from "./router/register-providers";
