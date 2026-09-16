import { auth } from "@clerk/nextjs/server";
import { RateLimiterPrisma } from "rate-limiter-flexible";
import prisma from "./db";

const FREE_POINTS = 2;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; // 30 days
const GENERATION_COST = 1;
// RateLimiterPrisma uses this value as a Prisma Client delegate, not a SQL table name.
// Prisma generates `prisma.usage` for the `Usage` model.
const USAGE_PRISMA_DELEGATE = "usage";

function createUsageTracker(points: number) {
  return new RateLimiterPrisma({
    storeClient: prisma,
    tableName: USAGE_PRISMA_DELEGATE,
    points,
    duration: DURATION,
  });
}

export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });

  return createUsageTracker(hasProAccess ? PRO_POINTS : FREE_POINTS);
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);
  return result;
}

export async function getUsageStatus() {
  const { userId, has } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const hasProAccess = has({ plan: "pro" });
  const totalPoints = hasProAccess ? PRO_POINTS : FREE_POINTS;
  const usageTracker = createUsageTracker(totalPoints);

  try {
    const result = await usageTracker.get(userId);

    if (!result) {
      console.log("[usage] no usage record", {
        userId,
        hasProAccess,
        totalPoints,
      });

      return {
        remainingPoints: totalPoints,
        msBeforeNext: DURATION * 1000,
        totalPoints,
        consumedPoints: 0,
      };
    }

    const usageStatus = {
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      totalPoints,
      consumedPoints: result.consumedPoints,
    };

    console.log("[usage] status", { userId, hasProAccess, usageStatus });
    return usageStatus;
  } catch (e) {
    console.error("[usage] status lookup failed", {
      userId,
      hasProAccess,
      error: e instanceof Error ? e.message : e,
    });
    return {
      remainingPoints: totalPoints,
      msBeforeNext: DURATION * 1000, // full 30 days in ms
      totalPoints,
      consumedPoints: 0,
    };
  }
}
