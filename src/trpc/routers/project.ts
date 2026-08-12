import { z } from "zod";

import { inngest } from "@/inngest/client";
import { BUILD_PROJECT_EVENT } from "@/inngest/events";
import { createTRPCRouter, baseProcedure } from "../init";

export const projectRouter = createTRPCRouter({
  build: baseProcedure
    .input(
      z.object({
        projectId: z.string().min(1),

        prompt: z.string().min(1).max(10_000),
      }),
    )
    .mutation(async ({ input }) => {
      await inngest.send({
        name: BUILD_PROJECT_EVENT,

        data: {
          projectId: input.projectId,

          prompt: input.prompt,
        },
      });

      return {
        success: true,
      };
    }),
});

