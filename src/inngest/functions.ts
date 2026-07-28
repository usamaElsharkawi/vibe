import { inngest } from "./client";
import { Sandbox } from "e2b";

export const startSandbox = inngest.createFunction(
  {
    id: "start-sandbox",
    triggers: [{ event: "app/task.created" }],
  },
  async ({ event, step }) => {
    const result = await step.run("create-sandbox", async () => {
      // Create sandbox from the pre-built template
      // The template's startCmd (sandbox-templates/nextjs/template.ts)
      // automatically runs 'npx next dev --turbopack' and waits for port 3000
      const sandbox = await Sandbox.create("vibe-nextjs-dev");

      // Get the public preview URL for port 3000
      const host = sandbox.getHost(3000);
      const previewUrl = `https://${host}`;

      // Log the sandbox details clearly for manual copying
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
  }
);
