export const PROVIDERS = {
  GOOGLE: "google",
  OPENROUTER: "openrouter",
  OPENAI: "openai",
} as const;

export type ProviderName = (typeof PROVIDERS)[keyof typeof PROVIDERS];
