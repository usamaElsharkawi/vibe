import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { generateSlug } from "random-word-slugs";
import { inngest } from "@/inngest";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { protectedProcedure, createTRPCRouter, } from "@/trpc/init";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1,{message:"id is required"}),
      }),
    )
    .query(async ({ input }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
        },
      });
      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ctx}) => {
    return prisma.project.findMany({
      where:{
        userId:ctx.userId,
      },
      orderBy: {
        createdAt: "asc",
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
      }),
    )
    .mutation(async ({ input,ctx }) => {
      const createdProject = await prisma.project.create({
        data: {
          userId:ctx.userId,
          name: generateSlug(2, {
            format: "kebab",
          }),
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
