import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const developmentPolicy: ModelPolicy = {
  name: "development",
  // Provider order is the canonical ordering the router should try.
  providerOrder: [PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER],
};
