import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { inngest } from "@/inngest";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { consumeCredits } from "@/lib/usage";
import { ModelRouter } from "@/ai/router/model-router";
import { generateText } from "ai";
import { ENVIRONMENTS } from "@/ai/constants/environment";

async function generateProjectName(prompt: string): Promise<string> {
  const modelRouter = new ModelRouter();
  const model = await modelRouter.getModel({
    environment:
      process.env.NODE_ENV === "production"
        ? ENVIRONMENTS.PRODUCTION
        : ENVIRONMENTS.DEVELOPMENT,
  });

  const { text } = await generateText({
    model,
    prompt: `The user asked: "${prompt}"
    generate a short, catchy, and creative name for a project based on the user's prompt. The name should be unique, memorable, and relevant to the prompt. Keep it concise and avoid generic terms and make it a valid slug EX: my-awesome-project.`,
    temperature: 0.3,
    maxOutputTokens: 20,
  });

  return text.trim();
}

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "id is required" }),
      }),
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });
      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    return prisma.project.findMany({
      where: {
        userId: ctx.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "id is required" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.project.deleteMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return { id: input.id };
    }),

  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10000, { message: "Value is too long" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await consumeCredits();
      } catch (e) {
        if (e instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Something went wrong",
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You have run out of credits",
          });
        }
      }

      const projectName = await generateProjectName(input.value);

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.userId,
          name: projectName,
          message: {
            create: {
              content: input.value,
              role: MessageRole.USER,
              type: MessageType.RESULT,
            },
          },
        },
      });

      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          prompt: input.value,
          projectId: createdProject.id,
        },
      });

      return createdProject;
    }),
});
