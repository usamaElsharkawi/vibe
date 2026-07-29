import { registerProvider } from "./provider-registry";
import { googleProvider } from "../providers/google";
import { openrouterProvider } from "../providers/openrouter";
import { openaiProvider } from "../providers/openai";

// Registers the built-in providers. This file should be imported by application bootstrap
// code so providers become available to the ModelRouter via the registry.
export function registerBuiltInProviders() {
  registerProvider(googleProvider);
  registerProvider(openrouterProvider);
  registerProvider(openaiProvider);
}

// Re-export registerProvider for ad-hoc registration
export { registerProvider } from "./provider-registry";
