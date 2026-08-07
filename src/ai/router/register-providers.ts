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

// This module should be imported and executed once during app bootstrap.
// It is intentionally kept separate from ModelRouter so the router remains pure.

export { registerProvider } from "./provider-registry";
