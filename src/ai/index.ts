// This becomes the public AI public API.

// Instead of importing deeply:

// import { codingAgent } from "@/ai/agent/coding-agent";

// everywhere else, export it from here so consumers can simply import from @/ai.

import { registerBuiltInProviders } from "./router/register-providers";

export { ModelRouter } from "./router/model-router";

// Preserve the existing public API surface while keeping the router entrypoint small.
export {
  createGeminiModel,
  isGeminiConfigured,
  googleProvider,
} from "./providers/google";
export {
  createOpenRouterModel,
  isOpenRouterConfigured,
  openrouterProvider,
} from "./providers/openrouter";
export {
  createOpenAIModel,
  isOpenAIConfigured,
  openaiProvider,
} from "./providers/openai";
export {
  registerBuiltInProviders,
  registerProvider,
  registerProvider as registerProviders,
} from "./router/register-providers";

// Composition root: ensure the built-in providers are registered exactly once
// when the public AI module is imported. The router itself stays pure and
// provider-agnostic; registration lives here at the bootstrap boundary.
// `registerBuiltInProviders` is idempotent (guarded internally), so this is
// safe even if @/ai is imported from multiple places.
registerBuiltInProviders();
