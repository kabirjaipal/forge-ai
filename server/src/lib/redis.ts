import RedisMock from 'ioredis-mock';

let inMemoryRedisInstance: any = null;

/**
 * Returns a standalone in-memory Redis client instance using `ioredis-mock`.
 * Requires no external Redis process, connection string, or socket URL.
 */
export function getRedisClient(): any {
  if (!inMemoryRedisInstance) {
    inMemoryRedisInstance = new (RedisMock as any)();
    console.log('⚡ Standalone in-memory Redis client initialized (ioredis-mock)');
  }
  return inMemoryRedisInstance;
}

export function checkRedisConnection(): boolean {
  return true;
}
