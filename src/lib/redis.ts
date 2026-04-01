import IORedis from "ioredis";
import { env } from "@/lib/env";

declare global {
  var redis: IORedis | undefined;
}

export const redis =
  global.redis ||
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}

