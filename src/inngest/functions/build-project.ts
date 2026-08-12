import { inngest } from "../client";

import { createSandboxService } from "@/sandbox/e2b/sandbox-service";

import { createCodingAgent } from "@/ai/agent/coding-agent";

export const buildProject = inngest.createFunction(
  {
    id: "build-project",

    retries: 2,

    triggers: {
      event: "vibe/project.build.requested",
    },
  },

  async ({ event, step }) => {
    const { projectId, prompt } = event.data;

    const result = await step.run("run-coding-agent", async () => {
      const sandbox = await createSandboxService();

      const agent = await createCodingAgent(sandbox);

      const response = await agent.generate({
        prompt,
      });

      const previewUrl = sandbox.getPreviewUrl(3000);

      return {
        projectId,

        sandboxId: sandbox.sandboxId,

        previewUrl,

        text: response.text,
      };
    });

    console.log(`[build-project] Preview: ${result.previewUrl}`);

    return result;
  },
);