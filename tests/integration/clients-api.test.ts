import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'a'.repeat(32);
process.env.IP_HASH_SALT = process.env.IP_HASH_SALT || 'b'.repeat(32);
process.env.TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'c'.repeat(32);
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://app:secret@localhost:5432/kaids';
process.env.MAIL_PROVIDER_API_KEY = process.env.MAIL_PROVIDER_API_KEY || 're_test_dummy';
process.env.MAIL_FROM = process.env.MAIL_FROM || 'enquiries@notify.kaids.in';
process.env.NOTIFY_TO = process.env.NOTIFY_TO || 'admin@kaids.in';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'd'.repeat(16);
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:8085';
process.env.PRIVACY_NOTICE_VERSION = process.env.PRIVACY_NOTICE_VERSION || '2026-11-v1';

import adminHandler from '../../api/admin.js';
import { activeSessions, createSessionCookie, generateCsrfToken } from '../../src/lib/session.js';
import { hashSessionToken } from '../../src/lib/auth.js';

describe('Client Manager API Verification', () => {
  const testSessionToken = 'test_token_clients_manager_123';
  const tokenHash = hashSessionToken(testSessionToken);
  const csrfToken = generateCsrfToken(tokenHash);

  beforeAll(() => {
    activeSessions.set(tokenHash, {
      user: {
        userId: 'admin-user-id-123',
        email: 'admin@kaids.in',
        name: 'Admin User',
        role: 'admin',
        mfaVerified: true,
        mustChangePassword: false,
        csrfToken
      },
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      expiresAt: Date.now() + 3600000
    });
  });

  function createMockRes() {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let data = '';

    return {
      statusCode,
      setHeader(name: string, val: string) {
        headers[name.toLowerCase()] = val;
      },
      end(chunk: string) {
        data = chunk;
        return this;
      },
      get result() {
        return {
          statusCode: this.statusCode,
          headers,
          data,
          json: () => {
            try { return JSON.parse(data); } catch { return null; }
          }
        };
      }
    };
  }

  it('blocks unauthenticated requests to /api/admin/clients with 401', async () => {
    const req = {
      method: 'GET',
      url: '/api/admin/clients',
      headers: {}
    };
    const res = createMockRes();
    await adminHandler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('fetches clients list successfully with 200', async () => {
    const req = {
      method: 'GET',
      url: '/api/admin/clients',
      headers: {
        cookie: `__Host-kaids_session=${testSessionToken}`
      }
    };
    const res = createMockRes();
    await adminHandler(req, res);
    expect(res.statusCode).toBe(200);
    const body = res.result.json();
    expect(body).toHaveProperty('clients');
    expect(Array.isArray(body.clients)).toBe(true);
    expect(body.clients.length).toBeGreaterThanOrEqual(15);
  });

  it('rejects client creation without CSRF token with 403', async () => {
    const req = {
      method: 'POST',
      url: '/api/admin/clients',
      headers: {
        cookie: `__Host-kaids_session=${testSessionToken}`,
        'content-type': 'application/json'
      },
      body: { name: 'Test Corporation' }
    };
    const res = createMockRes();
    await adminHandler(req, res);
    expect(res.statusCode).toBe(403);
  });
});
