import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, hashIp, hashSessionToken, encryptTotpSecret, decryptTotpSecret } from '../../src/lib/auth.js';

process.env.SESSION_SECRET = 'a'.repeat(32);
process.env.IP_HASH_SALT = 'b'.repeat(32);
process.env.TOTP_ENCRYPTION_KEY = 'c'.repeat(32);
process.env.DATABASE_URL = 'postgres://app:secret@localhost:5432/kaids';
process.env.MAIL_PROVIDER_API_KEY = 're_123';
process.env.MAIL_FROM = 'test@example.com';
process.env.NOTIFY_TO = 'admin@example.com';
process.env.CRON_SECRET = 'd'.repeat(16);
process.env.APP_ORIGIN = 'http://localhost:8085';

describe('Authentication & Cryptography Module', () => {
  it('hashes passwords with Argon2id and verifies correctly', async () => {
    const raw = 'StrongAdminPass123!';
    const hashed = await hashPassword(raw);

    expect(hashed).toContain('$argon2id$');
    const isValid = await verifyPassword(raw, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword', hashed);
    expect(isInvalid).toBe(false);
  });

  it('anonymises IP addresses with salted HMAC-SHA256', () => {
    const ip = '192.168.1.100';
    const hash1 = hashIp(ip);
    const hash2 = hashIp(ip);
    const hashDifferent = hashIp('192.168.1.101');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toContain(ip);
  });

  it('hashes session tokens with SHA-256', () => {
    const token = 'random_session_token_xyz_123';
    const hash = hashSessionToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
  });

  it('encrypts and decrypts TOTP secrets using AES-256-GCM', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptTotpSecret(encrypted);
    expect(decrypted).toBe(secret);
  });
});
