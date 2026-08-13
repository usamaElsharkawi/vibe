import { z } from "zod";

import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { inngest } from "@/inngest/client";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { createTRPCRouter, baseProcedure } from "../init";

export const projectRouter = createTRPCRouter({
  build: baseProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(10_000),
      }),
    )
    .mutation(async ({ input }) => {
      const createdMessage = await prisma.message.create({
        data: {
          content: input.prompt,
          role: MessageRole.USER,
          type: MessageType.RESULT,
        },
      });

      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          prompt: input.prompt,
        },
      });

      return {
        success: true,
        messageId: createdMessage.id,
      };
    }),
});
