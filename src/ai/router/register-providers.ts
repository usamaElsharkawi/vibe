import { registerProvider } from "./provider-registry";
import { googleProvider } from "../providers/google";
import { openrouterProvider } from "../providers/openrouter";
import { openaiProvider } from "../providers/openai";

let builtInProvidersRegistered = false;

export function registerBuiltInProviders() {
  if (builtInProvidersRegistered) return;

  registerProvider(googleProvider);
  registerProvider(openrouterProvider);
  registerProvider(openaiProvider);

  builtInProvidersRegistered = true;
}

export function ensureBuiltInProvidersRegistered() {
  registerBuiltInProviders();
}

// Re-export registerProvider for ad-hoc registration
export { registerProvider } from "./provider-registry";
