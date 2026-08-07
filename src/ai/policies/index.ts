import { developmentPolicy } from "./development";
import { productionPolicy } from "./production";
import { ENVIRONMENTS, type Environment } from "../constants/environment";
import type { ProviderName } from "../constants/providers";

export type ModelPolicy = {
  name: string;
  providerOrder: ProviderName[]; // ordered list of provider names
};


export function getPolicyForEnvironment(env: Environment | undefined): ModelPolicy {
  const environment = env === ENVIRONMENTS.PRODUCTION ? ENVIRONMENTS.PRODUCTION : ENVIRONMENTS.DEVELOPMENT;
  return environment === ENVIRONMENTS.PRODUCTION ? productionPolicy : developmentPolicy;
}

export { developmentPolicy, productionPolicy };
