import type { LanguageModelV4 } from "@ai-sdk/provider";
import { getPolicyForEnvironment, type ModelPolicy } from "../policies";
import {
  getProvidersByNames,
  listRegisteredProviders,
  type Provider,
} from "./provider-registry";
import { ensureBuiltInProvidersRegistered } from "./register-providers";

export type ModelRouterEnvironment = "development" | "production";

export interface ModelRouterContext {
  environment?: ModelRouterEnvironment;
}

function resolveEnvironment(context?: ModelRouterContext): ModelRouterEnvironment {
  if (context?.environment === "production") return "production";
  if (context?.environment === "development") return "development";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export class ModelRouter {
  async getModel(context?: ModelRouterContext): Promise<LanguageModelV4> {
    const environment = resolveEnvironment(context);

    // Load policy for environment. Policy contains provider order and model preferences.
    const policy: ModelPolicy = getPolicyForEnvironment(environment);

    // Ensure built-in providers are registered before the router attempts to resolve them.
    ensureBuiltInProvidersRegistered();

    // Request providers from registry in the order defined by the policy.
    const providers: Provider[] = getProvidersByNames(policy.providerOrder);

    const errors: Array<Error | string> = [];

    // Execute the policy: for each provider (in order) try the model preferences for that provider
    for (const prov of providers) {
      try {
        if (!prov.isConfigured()) {
          continue;
        }

        const prefs = policy.modelPreferences?.[prov.name];

        if (prefs && prefs.length > 0) {
          for (const modelId of prefs) {
            const model = prov.createModel(modelId);
            if (model) return model;
          }
        } else {
          const model = prov.createModel();
          if (model) return model;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : String(err));
      }
    }

    // If no model selected, provide some debugging help.
    const registered = listRegisteredProviders().join(", ");
    const errorDetail =
      errors.length > 0 ? ` Errors: ${errors.map((e) => String(e)).join("; ")}` : "";

    throw new Error(
      `ModelRouter failed to select a model for environment '${environment}'. Registered providers: [${registered}].` +
        errorDetail,
    );
  }
}