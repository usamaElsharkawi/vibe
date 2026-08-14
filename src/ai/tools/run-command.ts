import { tool } from "ai";
import { z } from "zod";

import type { CodingAgentContext } from "./types";

export const createRunCommandTool = (context: CodingAgentContext) =>
  tool({
    description:
      "Execute a shell command inside the project sandbox. Use this for installing dependencies, inspecting the project, running tests, running builds, or starting the development server.",

    inputSchema: z.object({
      command: z
        .string()
        .describe("The shell command to execute inside the sandbox."),
    }),

    execute: async ({ command }) => {
      try {
        const result = await context.sandbox.runCommand(command);

        return {
          success: true,
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
      } catch (error) {
        return {
          success: false,
          command,
          error:
            error instanceof Error
              ? error.message
              : "Command execution failed",
        };
      }
    },
  });