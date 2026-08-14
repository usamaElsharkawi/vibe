import type { E2BSandboxService } from "@/sandbox/e2b/sandbox-service";

import { createReadFileTool } from "./read-file";
import { createRunCommandTool } from "./run-command";
import { createWriteFileTool } from "./write-file";
import { CodingAgentContext } from "./types";

export function createCodingTools(sandbox: E2BSandboxService,context:CodingAgentContext) {
 

  return {
    read_file: createReadFileTool(context),

    write_file: createWriteFileTool(context),

    run_command: createRunCommandTool(context),
  };
}