// OpenAI Models
export const OPENAI_MODELS = {
  DEFAULT: "gpt-4o-mini", // Valid model name
} as const;

// OpenRouter Free Models (as of August 2026)
// These are real model IDs from https://openrouter.ai/collections/free-models
// Order = priority: fast, reliable free models first. Some premium free
// models (e.g. nemotron-3-ultra) are commonly rate-limited on the free tier,
// so they are kept later in the chain as fallbacks.
export const OPENROUTER_MODELS = {
  PRIMARY: "nvidia/nemotron-3-nano-30b-a3b:free", // Fast & reliable
  FALLBACK_1: "cohere/north-mini-code:free", // Cohere coding model (fast)
  FALLBACK_2: "poolside/laguna-s-2.1:free", // Coding agent model
  FALLBACK_3: "google/gemma-4-26b-a4b-it:free", // Google Gemma 4
  FALLBACK_4: "nvidia/nemotron-3-ultra-550b-a55b:free", // Best (often rate-limited)
  FALLBACK_5: "nvidia/nemotron-3-super-120b-a12b:free", // 120B MoE (slow)
} as const;

// Google Gemini Models (valid as of August 2026)
export const GEMINI_MODELS = {
  DEFAULT: "gemini-3.5-flash", // Stable model for sustained frontier performance
  LITE: "gemini-3.5-flash-lite", // Fastest, most cost-effective
  PRO: "gemini-2.5-pro", // Most advanced for complex tasks
  FLASH_2_5: "gemini-2.5-flash", // Best price-performance
} as const;

// OpenRouter fallback chain for development
export const OPENROUTER_FALLBACK_MODELS = [
  OPENROUTER_MODELS.PRIMARY,
  OPENROUTER_MODELS.FALLBACK_1,
  OPENROUTER_MODELS.FALLBACK_2,
  OPENROUTER_MODELS.FALLBACK_3,
  OPENROUTER_MODELS.FALLBACK_4,
  OPENROUTER_MODELS.FALLBACK_5,
] as const;
