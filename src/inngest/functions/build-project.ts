import { inngest } from "../client";
import { generateText } from "ai";

import {
  connectSandboxService,
  createSandboxService,
} from "@/sandbox/e2b/sandbox-service";

import { createCodingAgent } from "@/ai/agent/coding-agent";
import { ModelRouter } from "@/ai";
import { MessageRole, MessageType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";

function generateTitle(summary: string, prompt: string): string {
  const firstSentence = summary.split(".")[0].trim();
  if (firstSentence.length > 0 && firstSentence.length <= 60) {
    return firstSentence;
  }
  return prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
}

async function generateResponseMessage(
  prompt: string,
  summary: string,
  files: Record<string, string>,
  sandboxUrl: string,
): Promise<string> {
  const modelRouter = new ModelRouter();
  const model = await modelRouter.getModel({ environment: "development" });

  const fileList = Object.keys(files).join(", ");

  const { text } = await generateText({
    model,
    prompt: `The user asked: "${prompt}"

I built this and created these files: ${fileList}

Summary: ${summary}

Preview URL: ${sandboxUrl}

Write a friendly 2-3 sentence response explaining what was created, highlighting key features, and mentioning the preview link. Keep it conversational and encouraging.`,
    temperature: 0.3,
    maxOutputTokens: 200,
  });

  return text.trim();
}

export const buildProject = inngest.createFunction(
  {
    id: "build-project",

    retries: 2,

    triggers: {
      event: "vibe/project.build.requested",
    },
  },

  async ({ event, step }) => {
    const { prompt, projectId } = event.data;

    const sandboxId = await step.run("create-sandbox", async () => {
      const sandbox = await createSandboxService();
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run("fetch-history", async () => {
      const msgs = await prisma.message.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return msgs.reverse();
    });

    const result = await step.run("run-coding-agent", async () => {
      const sandbox = await connectSandboxService(sandboxId);

      const { agent, context } = await createCodingAgent(sandbox);

      const history = previousMessages.map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      }));

      const response = await agent.generate({
        messages: [...history, { role: "user", content: prompt }],
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

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await connectSandboxService(sandboxId);
      return sandbox.getPreviewUrl(3000);
    });

    const isError = !result.summary || Object.keys(result.files).length === 0;

    const savedMessage = await step.run("save-result", async () => {
      if (isError) {
        return prisma.message.create({
          data: {
            projectId: projectId,
            content: "Something went wrong. Please try again.",
            role: MessageRole.ASSISTANT,
            type: MessageType.ERROR,
          },
        });
      }

      const title = generateTitle(result.summary, prompt);
      const responseContent = await generateResponseMessage(
        prompt,
        result.summary,
        result.files,
        sandboxUrl,
      );

      return prisma.message.create({
        data: {
          projectId: projectId,
          content: responseContent,
          role: MessageRole.ASSISTANT,
          type: MessageType.RESULT,
          fragment: {
            create: {
              sandboxUrl,
              title,
              files: result.files,
            },
          },
        },
        include: {
          fragment: true,
        },
      });
    });

    console.log(`[build-project] Preview: ${sandboxUrl}`);

    return {
      ...result,
      sandboxUrl,
      messageId: savedMessage.id,
      isError,
    };
  },
);
