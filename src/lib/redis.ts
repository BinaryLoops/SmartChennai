import Redis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redisSubscriber: Redis | undefined;
}

export function createRedisClient(customOptions: Partial<RedisOptions> = {}): Redis {
  const client = new Redis(REDIS_URL, {
    ...redisOptions,
    ...customOptions,
  });

  client.on("error", (err) => {
    // Avoid noisy unhandled crash logs if Redis is starting
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[Redis] Connected successfully to", REDIS_URL);
  });

  return client;
}

export function getRedisClient(): Redis {
  if (process.env.NODE_ENV === "production") {
    return createRedisClient();
  }
  if (!global.__redisClient) {
    global.__redisClient = createRedisClient();
  }
  return global.__redisClient;
}

export const redisConnection = getRedisClient();

export async function checkRedisHealth(): Promise<{
  ok: boolean;
  latencyMs?: number;
  info?: Record<string, string>;
  error?: string;
}> {
  const client = getRedisClient();
  const start = Date.now();
  try {
    const pong = await client.ping();
    const latencyMs = Date.now() - start;
    if (pong === "PONG") {
      return { ok: true, latencyMs };
    }
    return { ok: false, error: `Unexpected PING response: ${pong}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to reach Redis" };
  }
}
