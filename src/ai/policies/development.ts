import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const developmentPolicy: ModelPolicy = {
  name: "development",
  // Development uses ONLY OpenRouter with dynamically fetched free models.
  // This ensures 100% free development experience with automatic failover
  // to the next best free model when rate limits are hit.
  // The models are ranked by programming capability on each startup.
  providerOrder: [PROVIDERS.OPENROUTER],
};
