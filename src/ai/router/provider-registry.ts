import type { LanguageModelV4 } from "@ai-sdk/provider";

export type Provider = {
  /** stable provider name, e.g. 'openai', 'google', 'openrouter' */
  name: string;
  /** returns true if provider is configured in the environment */
  isConfigured: () => boolean;
  /** create a LanguageModel. If modelId is undefined provider can return a default model */
  createModel: (modelId?: string) => LanguageModelV4 | null;
};

const registry = new Map<string, Provider>();

export function registerProvider(provider: Provider) {
  if (!provider || !provider.name) return;
  registry.set(provider.name, provider);
}

export function getProvider(name: string): Provider | undefined {
  return registry.get(name);
}

export function getProvidersByNames(names: string[]): Provider[] {
  return names
    .map((n) => registry.get(n))
    .filter((p): p is Provider => typeof p !== "undefined");
}

export function listRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
