import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
 
export const createTRPCContext = cache(async () => {
  const authData = await auth();
  return {
    auth: authData,
    userId: authData.userId,
  };
});
 
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});
 
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
 
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action.",
    });
  }
 
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
      userId: ctx.userId,
    },
  });
});