import { tool } from "ai";
import { z } from "zod";

import type { CodingAgentContext } from "./types";

export const createReadFileTool = (context: CodingAgentContext) =>
  tool({
    description:
      "Read the contents of a file from the project workspace. Use this before modifying an existing file when you need to understand its current contents.",

    inputSchema: z.object({
      path: z
        .string()
        .describe("Path of the file relative to the project workspace."),
    }),

    execute: async ({ path }) => {
      try {
        const content = await context.sandbox.readFile(path);

        return {
          success: true,
          path,
          content,
        };
      } catch (error) {
        return {
          success: false,
          path,
          error:
            error instanceof Error
              ? error.message
              : "Failed to read file",
        };
      }
    },
  });