import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { inngest } from "@/inngest";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";

export const messageRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    return prisma.message.findMany({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        fragment: true,
      },
    });
  }),

  create: baseProcedure
    .input(
      z.object({
        value: z.string().min(1, { message: "message is required" }),
      }),
    )
    .mutation(async ({ input }) => {
      const createdMessage = await prisma.message.create({
        data: {
          content: input.value,
          role: MessageRole.USER,
          type: MessageType.RESULT,
        },
      });

      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          prompt: input.value,
        },
      });

      return createdMessage;
    }),
});
