import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/forgeai?schema=public'),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().default('super-secret-jwt-key-forgeai-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),
  TRUST_PROXY: z.coerce.boolean().default(true),
  REQUEST_BODY_LIMIT: z.string().default('10mb'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  // S3 / Object Storage Configuration (Backblaze B2 / AWS S3 / MinIO)
  S3_ENDPOINT: z.string().default('https://s3.us-east-005.backblazeb2.com'),
  S3_REGION: z.string().default('us-east-005'),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  S3_BUCKET: z.string().default('kabir-dev'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});


const configResult = configSchema.safeParse(process.env);

if (!configResult.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(configResult.error.format());
  process.exit(1);
}

export const config = configResult.data;
export default config;
