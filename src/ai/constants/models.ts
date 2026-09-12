// OpenAI Models
export const OPENAI_MODELS = {
  DEFAULT: "gpt-4o-mini", // Valid model name for production use
} as const;

// OpenRouter Free Models (LEGACY - kept as hardcoded fallback)
// NOTE: In development, the system now dynamically fetches and ranks free models
// from OpenRouter's API based on programming capabilities. These hardcoded models
// are only used as a fallback if the dynamic fetch fails.
// 
// The dynamic system:
// 1. Fetches all free models from OpenRouter API
// 2. Ranks them by programming capability (code generation, context length, model size)
// 3. Tries them in order until one succeeds
// 4. Caches rankings for 1 hour to minimize API calls
// 5. Falls back to this hardcoded list if API fetch fails
export const OPENROUTER_MODELS = {
  PRIMARY: "nvidia/nemotron-3-nano-30b-a3b:free", // Fast & reliable
  FALLBACK_1: "cohere/north-mini-code:free", // Cohere coding model (fast)
  FALLBACK_2: "poolside/laguna-s-2.1:free", // Coding agent model
  FALLBACK_3: "google/gemma-4-26b-a4b-it:free", // Google Gemma 4
  FALLBACK_4: "nvidia/nemotron-3-ultra-550b-a55b:free", // Best (often rate-limited)
  FALLBACK_5: "nvidia/nemotron-3-super-120b-a12b:free", // 120B MoE (slow)
} as const;

// Google Gemini Models (valid as of August 2026)
// NOTE: No longer used in development or production policies
// Kept for potential future use or custom routing scenarios
export const GEMINI_MODELS = {
  DEFAULT: "gemini-3.5-flash", // Stable model for sustained frontier performance
  LITE: "gemini-3.5-flash-lite", // Fastest, most cost-effective
  PRO: "gemini-2.5-pro", // Most advanced for complex tasks
  FLASH_2_5: "gemini-2.5-flash", // Best price-performance
} as const;

// OpenRouter fallback chain for development (LEGACY)
// Used only if dynamic model fetching fails
export const OPENROUTER_FALLBACK_MODELS = [
  OPENROUTER_MODELS.PRIMARY,
  OPENROUTER_MODELS.FALLBACK_1,
  OPENROUTER_MODELS.FALLBACK_2,
  OPENROUTER_MODELS.FALLBACK_3,
  OPENROUTER_MODELS.FALLBACK_4,
  OPENROUTER_MODELS.FALLBACK_5,
] as const;
