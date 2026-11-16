import { hash, verify } from '@node-rs/argon2';
import crypto from 'node:crypto';
import { getEnv } from './env.js';

// OWASP Recommended Argon2id parameters
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
  outputLen: 32
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Constant-time dummy verify for non-existent users
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQxMjM0NTY3OA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export async function dummyVerify(): Promise<void> {
  try {
    await verify(DUMMY_HASH, 'dummy-password-value-to-equalize-timing');
  } catch {
    // Expected to fail, runs argon2 to prevent timing side channels
  }
}

// IP Anonymisation / Hashing with Salt
export function hashIp(ip: string): string {
  const env = getEnv();
  return crypto.createHmac('sha256', env.IP_HASH_SALT).update(ip.trim()).digest('hex');
}

// Session Token SHA-256
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate secure random alphanumeric string
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// AES-256-GCM for TOTP Secret Encryption at rest
export function encryptTotpSecret(secret: string): string {
  const env = getEnv();
  const key = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotpSecret(encryptedData: string): string {
  const env = getEnv();
  const key = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
  const [ivHex, tagHex, textHex] = encryptedData.split(':');
  if (!ivHex || !tagHex || !textHex) throw new Error('Invalid encrypted format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(textHex, 'hex')) + decipher.final('utf8');
}
