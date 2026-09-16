-- RateLimiterPrisma queries for both future and non-expiring records.
ALTER TABLE "Usage" ALTER COLUMN "expire" DROP NOT NULL;
