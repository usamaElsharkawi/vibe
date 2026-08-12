import { tool } from "ai";
import { z } from "zod";

import type { CodingAgentContext } from "./types";

export const createWriteFileTool = (context: CodingAgentContext) =>
  tool({
    description:
      "Create or completely replace a file in the project workspace. Use this to implement or modify application code.",

    inputSchema: z.object({
      path: z
        .string()
        .describe("Path of the file relative to the project workspace."),

      content: z
        .string()
        .describe("The complete contents that should be written to the file."),
    }),

    execute: async ({ path, content }) => {
      try {
        await context.sandbox.writeFile(path, content);

        return {
          success: true,
          path,
          message: `Successfully wrote ${path}`,
        };
      } catch (error) {
        return {
          success: false,
          path,
          error:
            error instanceof Error
              ? error.message
              : "Failed to write file",
        };
      }
    },
  });