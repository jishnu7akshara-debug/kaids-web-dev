import crypto from 'node:crypto';
import { getEnv } from './env.js';
import { hashSessionToken, generateRandomToken } from './auth.js';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'viewer';
  mfaVerified: boolean;
  mustChangePassword: boolean;
  csrfToken: string;
}

// In-memory sessions store with DB backing
export const activeSessions = new Map<string, {
  user: SessionData;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}>();

export function createSessionCookie(token: string): string {
  // __Host- prefix requires Secure; Path=/; no Domain
  return `__Host-kaids_session=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=36000`;
}

export function generateCsrfToken(sessionId: string): string {
  const env = getEnv();
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(sessionId).digest('hex');
}

export function verifyCsrfToken(sessionId: string, token: string): boolean {
  if (!token || !sessionId) return false;
  const expected = generateCsrfToken(sessionId);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
