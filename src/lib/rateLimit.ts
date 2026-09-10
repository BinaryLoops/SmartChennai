import { getRedisClient } from "./redis";

import { prisma } from "./prisma";

// Cache config for 60 seconds
let cachedConfig: { rateLimitMax: number; rateLimitWindow: number } | null = null;
let lastCacheUpdate = 0;

// In-memory fallback in case Redis is momentarily disconnected
const fallbackCache = new Map<string, { count: number; resetAt: number }>();

async function getRateLimitConfig() {
  const now = Date.now();
  if (cachedConfig && now - lastCacheUpdate < 60000) {
    return cachedConfig;
  }
  try {
    const config = await prisma.simulationSetting.findUnique({ where: { key: "global" } });
    if (config) {
      cachedConfig = {
        rateLimitMax: config.rateLimitMax,
        rateLimitWindow: config.rateLimitWindow,
      };
      lastCacheUpdate = now;
      return cachedConfig;
    }
  } catch (err) {
    console.error("[RateLimiter] DB config fetch failed", err);
  }
  // Default fallback
  return {
    rateLimitMax: Number(process.env.INCIDENT_RATE_LIMIT_MAX || 100),
    rateLimitWindow: Number(process.env.INCIDENT_RATE_LIMIT_WINDOW_MS || 900000)
  };
}

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const sanitizedIp = (ip || "127.0.0.1").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `ratelimit:incidents:${sanitizedIp}`;

  const config = await getRateLimitConfig();
  const WINDOW_SECONDS = Math.floor(config.rateLimitWindow / 1000);
  const MAX_REQUESTS = config.rateLimitMax;

  try {
    const client = getRedisClient();
    const multi = client.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    if (results && results[0] && results[1]) {
      const current = (results[0][1] as number) || 1;
      let ttl = (results[1][1] as number) || -1;

      // If key is brand new, set expiration
      if (ttl === -1) {
        await client.expire(key, WINDOW_SECONDS);
        ttl = WINDOW_SECONDS;
      }

      const allowed = current <= MAX_REQUESTS;
      const remaining = Math.max(0, MAX_REQUESTS - current);

      return {
        allowed,
        current,
        limit: MAX_REQUESTS,
        remaining,
        resetInSeconds: Math.max(1, ttl),
      };
    }
  } catch (err) {
    console.warn("[RateLimiter] Redis unavailable, using in-memory limiter:", err);
  }

  // Fallback in-memory rate limiter
  const now = Date.now();
  const entry = fallbackCache.get(sanitizedIp);

  if (!entry || now > entry.resetAt) {
    fallbackCache.set(sanitizedIp, {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    });
    return {
      allowed: true,
      current: 1,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      resetInSeconds: WINDOW_SECONDS,
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= MAX_REQUESTS,
    current: entry.count,
    limit: MAX_REQUESTS,
    remaining,
    resetInSeconds,
  };
}
