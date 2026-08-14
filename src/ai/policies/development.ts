import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const developmentPolicy: ModelPolicy = {
  name: "development",
    // Provider order is the canonical ordering the router should try.
  // OpenRouter is preferred in development because it offers a free-tier
  // fallback model chain and is not subject to Google's per-day quota.
  providerOrder: [PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE],
};
