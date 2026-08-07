import type { LanguageModelV4 } from "@ai-sdk/provider";
import { getPolicyForEnvironment, type ModelPolicy } from "../policies";
import {
  getProvidersByNames,
  listRegisteredProviders,
  type Provider,
} from "./provider-registry";
import { ENVIRONMENTS, type Environment } from "../constants/environment";

export type ModelRouterEnvironment = Environment;

export interface ModelRouterContext {
  environment?: ModelRouterEnvironment;
}

export type RoutingResult = {
  model: LanguageModelV4;
  provider: string;
  modelId?: string;
};

function resolveEnvironment(
  context?: ModelRouterContext,
): ModelRouterEnvironment {
  if (context?.environment === ENVIRONMENTS.PRODUCTION)
    return ENVIRONMENTS.PRODUCTION;
  if (context?.environment === ENVIRONMENTS.DEVELOPMENT)
    return ENVIRONMENTS.DEVELOPMENT;
  return process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;
}

export class ModelRouter {
  async getModel(context?: ModelRouterContext): Promise<LanguageModelV4> {
    return (await this.getRoutingResult(context)).model;
  }

  async getRoutingResult(context?: ModelRouterContext): Promise<RoutingResult> {
    const environment = resolveEnvironment(context);
    const policy: ModelPolicy = getPolicyForEnvironment(environment);

    // Request providers from registry in the order defined by the policy.
    const providers: Provider[] = getProvidersByNames(policy.providerOrder);

    const errors: Array<Error | string> = [];

    // Execute the policy: ask each provider for its preferred model.
    for (const prov of providers) {
      try {
        if (!prov.isConfigured()) {
          continue;
        }

        const result = prov.getModel();
        if (result) {
          return {
            model: result.model,
            provider: prov.name,
            modelId: result.modelId,
          };
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : String(err));
      }
    }

    // If no model selected, provide some debugging help.
    const registered = listRegisteredProviders().join(", ");
    const errorDetail =
      errors.length > 0
        ? ` Errors: ${errors.map((e) => String(e)).join("; ")}`
        : "";

    throw new Error(
      `ModelRouter failed to select a model for environment '${environment}'. Registered providers: [${registered}].` +
        errorDetail,
    );
  }
}
