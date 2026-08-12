import { inngest } from "../client";

import { createSandboxService } from "@/sandbox/e2b/sandbox-service";

export const startSandbox = inngest.createFunction(
  {
    id: "start-sandbox",

    triggers: [{ event: "app/task.created" }],
  },

    async ({ step }) => {
    const result = await step.run("create-sandbox", async () => {
      const sandbox = await createSandboxService();

      const previewUrl = sandbox.getPreviewUrl(3000);

      console.log("");

      console.log("========== SANDBOX STARTED ==========");

      console.log("");

      console.log("Sandbox ID:");

      console.log(sandbox.sandboxId);

      console.log("");

      console.log("Preview URL:");

      console.log(previewUrl);

      console.log("");

      console.log("=====================================");

      console.log("");

      return {
        sandboxId: sandbox.sandboxId,

        previewUrl,
      };
    });

    return result;
  },
);