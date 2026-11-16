import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_MIGRATE: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters'),
  TOTP_ENCRYPTION_KEY: z.string().min(32, 'TOTP_ENCRYPTION_KEY must be at least 32 characters'),
  MAIL_PROVIDER_API_KEY: z.string().min(1, 'MAIL_PROVIDER_API_KEY is required'),
  MAIL_FROM: z.string().min(1, 'MAIL_FROM is required'),
  NOTIFY_TO: z.string().min(1, 'NOTIFY_TO is required'),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  TURNSTILE_ENABLED: z.enum(['true', 'false']).default('false'),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  APP_ORIGIN: z.string().url('APP_ORIGIN must be a valid URL'),
  PRIVACY_NOTICE_VERSION: z.string().min(1, 'PRIVACY_NOTICE_VERSION is required').default('2026-11-v1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const failedFields = Object.keys(result.error.flatten().fieldErrors);
    console.error(`[CRITICAL] Cold start configuration error: Missing or malformed environment variable(s): ${failedFields.join(', ')}`);
    throw new Error(`Configuration error. Check system logs for details.`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
