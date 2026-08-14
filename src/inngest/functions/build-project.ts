import { inngest } from "../client";

import {
  connectSandboxService,
  createSandboxService,
} from "@/sandbox/e2b/sandbox-service";

import { createCodingAgent } from "@/ai/agent/coding-agent";
import { MessageRole, MessageType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";

export const buildProject = inngest.createFunction(
  {
    id: "build-project",

    retries: 2,

    triggers: {
      event: "vibe/project.build.requested",
    },
  },

  async ({ event, step }) => {
    const { prompt,projectId } = event.data;

    const sandboxId = await step.run("create-sandbox", async () => {
      const sandbox = await createSandboxService();
      return sandbox.sandboxId;
    });

    const result = await step.run("run-coding-agent", async () => {
      const sandbox = await connectSandboxService(sandboxId);

      const { agent, context } = await createCodingAgent(sandbox);

      const response = await agent.generate({
        prompt,
      });

      const summaryMatch = response.text.match(
        /<task_summary>([\s\S]*?)<\/task_summary>/,
      );
      const summary = summaryMatch ? summaryMatch[1].trim() : "";

      return {
        sandboxId: sandbox.sandboxId,
        summary,
        files: context.files,
      };
    });

    const sandBoxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await connectSandboxService(sandboxId);
      return sandbox.getPreviewUrl(3000);
    });

    const isError =
      !result.summary || Object.keys(result.files).length === 0;

    const savedMessage = await step.run("save-result", async () => {
      if (isError) {
        return prisma.message.create({
          data: {
            projectId:projectId,
            content: "Something went wrong. Please try again.",
            role: MessageRole.ASSISTANT,
            type: MessageType.ERROR,
          },
        });
      }

      return prisma.message.create({
        data: {
          projectId:projectId,
          content: result.summary,
          role: MessageRole.ASSISTANT,
          type: MessageType.RESULT,
          fragment: {
            create: {
              sanboxUrl: sandBoxUrl,
              title: "Fragment",
              files: result.files,
            },
          },
        },
        include: {
          fragment: true,
        },
      });
    });

    console.log(`[build-project] Preview: ${sandBoxUrl}`);

    return {
      ...result,
      sandBoxUrl,
      messageId: savedMessage.id,
      isError,
    };
  },
);
