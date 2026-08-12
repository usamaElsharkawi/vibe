import { inngest } from "./client";

import { buildProject, startSandbox } from "./functions";

export const inngestFunctions = [startSandbox, buildProject];

export { inngest };