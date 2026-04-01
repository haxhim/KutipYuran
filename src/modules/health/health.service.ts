import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function getHealthStatus() {
  await db.$queryRaw`SELECT 1`;
  await redis.ping();

  return {
    ok: true,
    timestamp: new Date().toISOString(),
  };
}
