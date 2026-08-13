import { ToolLoopAgent, stepCountIs } from "ai";

import { createCodingTools } from "@/ai/tools";
import { CODING_AGENT_INSTRUCTIONS } from "@/ai/prompts/coding-agent-prompt";
import { ENVIRONMENTS } from "@/ai/constants/environment";
import { ModelRouter } from "@/ai";
import type { E2BSandboxService } from "@/sandbox/e2b/sandbox-service";
import { CodingAgentContext } from "../tools/types";

const MAX_AGENT_STEPS = 30;

export async function createCodingAgent(sandbox: E2BSandboxService) {
  const context: CodingAgentContext = {
    sandbox,
    files: {},
  };

  const tools = createCodingTools(sandbox,context);

  const modelRouter = new ModelRouter();
  const model = await modelRouter.getModel({
    environment: ENVIRONMENTS.DEVELOPMENT,
  });

  const agent = new ToolLoopAgent({
    model,

    instructions: CODING_AGENT_INSTRUCTIONS,

    tools,

    stopWhen: stepCountIs(MAX_AGENT_STEPS),

    maxRetries: 2,

    temperature: 0.2,

    onStepEnd: async (step) => {
      console.log(`[coding-agent] step=${step.stepNumber}`);

      if (step.text) {
        console.log(`[coding-agent] text=${step.text}`);
      }

      if (step.toolCalls?.length) {
        console.log(
          `[coding-agent] tools=${step.toolCalls
            .map((call) => call.toolName)
            .join(", ")}`,
        );
      }
    },
  });

  return {
    agent,
    context
  }
}