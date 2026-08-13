import type { E2BSandboxService } from "@/sandbox/e2b/sandbox-service";

export interface CodingAgentContext {
  sandbox: E2BSandboxService;
  files:Record<string,string>;
}