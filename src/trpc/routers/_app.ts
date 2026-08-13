import { createTRPCRouter } from "../init";
import { messageRouter } from "@/modules/messages/server/procedures";
import { projectRouter } from "./project";

export const appRouter = createTRPCRouter({
  messages: messageRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
