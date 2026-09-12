import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { inngest } from "@/inngest";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { consumeCredits } from "@/lib/usage";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";

export const messageRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "projectId is required" }),
      }),
    )
    .query(async ({ input, ctx }) => {
      return prisma.message.findMany({
        where: {
          projectId: input.projectId,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          fragment: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10000, { message: "Value is too long" }),
        projectId: z.string().min(1, { message: "projectId is required" }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await consumeCredits();
      } catch (e) {
        if (e instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Something went worng",
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You have run out of credits",
          });
        }
      }

      const createdMessage = await prisma.message.create({
        data: {
          projectId: input.projectId,
          content: input.value,
          role: MessageRole.USER,
          type: MessageType.RESULT,
        },
      });

      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          prompt: input.value,
          projectId: input.projectId,
        },
      });

      return createdMessage;
    }),
});
