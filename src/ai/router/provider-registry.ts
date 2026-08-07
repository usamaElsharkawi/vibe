import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { ProviderName } from "../constants/providers";

export type ProviderResult = {
  model: LanguageModelV4;
  modelId?: string;
};

export type Provider = {
  /** stable provider name */
  name: ProviderName;
  /** returns true if provider is configured in the environment */
  isConfigured: () => boolean;
  /** returns the provider's preferred LanguageModel and optional model ID */
  getModel: () => ProviderResult | null;
};

const registry = new Map<string, Provider>(); 

export function registerProvider(provider: Provider) {
  if (!provider || !provider.name) return;
  registry.set(provider.name, provider);
}

export function getProvider(name: ProviderName): Provider | undefined {
  return registry.get(name);
}

export function getProvidersByNames(names: ProviderName[]): Provider[] {
  return names
    .map((n) => registry.get(n))
    .filter((p): p is Provider => typeof p !== "undefined");
}

export function listRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
