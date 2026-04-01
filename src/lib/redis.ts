import IORedis from "ioredis";
import { env } from "@/lib/env";

declare global {
  var redis: IORedis | undefined;
}

function createRedisClient() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function getRedisClient() {
  if (!global.redis) {
    global.redis = createRedisClient();
  }

  return global.redis;
}

export const redis = new Proxy({} as IORedis, {
  get(_target, property, receiver) {
    const client = getRedisClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
