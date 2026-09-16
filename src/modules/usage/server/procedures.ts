import { getUsageStatus } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const result = await getUsageStatus();

      return result;
    } catch (error) {
      console.error(
        "[usage] status request failed",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }),
});
