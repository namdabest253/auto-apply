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

let _scrapeQueue: any = null;

export async function getScrapeQueue() {
  if (!_scrapeQueue) {
    const { Queue } = await import("bullmq");
    _scrapeQueue = new Queue("scrape", {
      connection: getRedisConnectionOptions(),
    });
  }
  return _scrapeQueue;
}
