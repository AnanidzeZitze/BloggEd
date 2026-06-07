import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function makeRatelimit(prefix: string, requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), prefix });
}

// 5 generate calls per user per minute (Gemini + Imagen are billed)
export const generateLimiter = makeRatelimit("rl:generate", 5, "1 m");

// 20 publish calls per user per minute
export const publishLimiter = makeRatelimit("rl:publish", 20, "1 m");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ limited: boolean }> {
  if (!limiter) return { limited: false }; // no Redis configured — allow through
  const { success } = await limiter.limit(identifier);
  return { limited: !success };
}
