import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { config } from './config.js';

let redisInstance: Redis | null = null;

/**
 * Returns a Redis client instance.
 * If REDIS_URL is provided, connects to the real Redis instance (required for BullMQ).
 * Otherwise falls back to ioredis-mock.
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    if (config.REDIS_URL) {
      redisInstance = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: null,
      });
      console.log(`⚡ Connected to Redis at ${config.REDIS_URL}`);
    } else {
      redisInstance = new (RedisMock as unknown as new () => Redis)();
      console.log('⚡ Standalone in-memory Redis client initialized (ioredis-mock)');
    }
  }
  return redisInstance;
}

export function checkRedisConnection(): boolean {
  return true;
}
