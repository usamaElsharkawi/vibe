import { developmentPolicy } from "./development";
import { productionPolicy } from "./production";

export type ModelPolicy = {
  name: string;
  providerOrder: string[]; // ordered list of provider names
  modelPreferences?: Record<string, string[]>; // providerName -> ordered model ids
};

export function getPolicyForEnvironment(env: string | undefined): ModelPolicy {
  const e = env === "production" ? "production" : "development";
  return e === "production" ? productionPolicy : developmentPolicy;
}

export { developmentPolicy, productionPolicy };
