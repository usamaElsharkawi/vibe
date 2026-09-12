import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const productionPolicy: ModelPolicy = {
  name: "production",
  // Production uses ONLY OpenAI for reliable, high-quality code generation.
  // No fallback providers to ensure consistent quality and performance.
  providerOrder: [PROVIDERS.OPENAI],
};
