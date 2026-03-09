import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";

/**
 * Redis connection options for BullMQ.
 * CRITICAL: maxRetriesPerRequest must be null for BullMQ blocking commands.
 */
export function getRedisConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    maxRetriesPerRequest: null,
  };
}

export const scrapeQueue = new Queue("scrape", {
  connection: getRedisConnectionOptions(),
});
