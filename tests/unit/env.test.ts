import { describe, it, expect, vi, beforeEach } from 'vitest';
import { envSchema } from '../../src/lib/env.js';

describe('Environment Variables Validation', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://app:secret@localhost:5432/kaids',
    SESSION_SECRET: 'a'.repeat(32),
    IP_HASH_SALT: 'b'.repeat(32),
    TOTP_ENCRYPTION_KEY: 'c'.repeat(32),
    MAIL_PROVIDER_API_KEY: 're_123456789',
    MAIL_FROM: 'KAIDS <enquiries@notify.kaids.in>',
    NOTIFY_TO: 'admin@kaids.in',
    CRON_SECRET: 'd'.repeat(16),
    TURNSTILE_ENABLED: 'false',
    APP_ORIGIN: 'http://localhost:8085',
    PRIVACY_NOTICE_VERSION: '2026-11-v1',
    NODE_ENV: 'test'
  };

  it('validates a complete, valid environment configuration', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('fails when a critical variable like DATABASE_URL is missing', () => {
    const invalid = { ...validEnv, DATABASE_URL: '' };
    const result = envSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('DATABASE_URL');
    }
  });

  it('fails when SESSION_SECRET is shorter than 32 characters', () => {
    const invalid = { ...validEnv, SESSION_SECRET: 'short' };
    const result = envSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('SESSION_SECRET');
    }
  });

  it('fails when APP_ORIGIN is not a valid URL', () => {
    const invalid = { ...validEnv, APP_ORIGIN: 'invalid-url' };
    const result = envSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('APP_ORIGIN');
    }
  });
});
