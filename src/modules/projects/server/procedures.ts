import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { generateSlug } from "random-word-slugs";
import { inngest } from "@/inngest";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";

export const projectsRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    return prisma.project.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  create: baseProcedure
    .input(
      z.object({
        value: z.string()
        .min(1, { message: "Value is required" })
        .max(10000,{message:"Value is too long"})
      }),
    )
    .mutation(async ({ input }) => {
      const createdProject = await prisma.project.create({
        data:{
          name:generateSlug(2,{
            format:"kebab"
          }),
          message:{
            create:{
              content: input.value,
              role: MessageRole.USER,
              type: MessageType.RESULT,
            }
          }
        }
      })
    
      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          prompt: input.value,
          projectId:createdProject.id
        },
      });

      return createdProject;
    }),
});
