import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const productionPolicy: ModelPolicy = {
  name: "production",
  // Production prefers higher-quality providers first.
  providerOrder: [PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE],
};
