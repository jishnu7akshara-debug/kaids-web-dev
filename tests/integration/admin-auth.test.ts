import { describe, it, expect } from 'vitest';

process.env.SESSION_SECRET = 'a'.repeat(32);
process.env.IP_HASH_SALT = 'b'.repeat(32);
process.env.TOTP_ENCRYPTION_KEY = 'c'.repeat(32);
process.env.DATABASE_URL = 'postgres://app:secret@localhost:5432/kaids';
process.env.MAIL_PROVIDER_API_KEY = 're_test_dummy';
process.env.MAIL_FROM = 'enquiries@notify.kaids.in';
process.env.NOTIFY_TO = 'admin@kaids.in';
process.env.CRON_SECRET = 'd'.repeat(16);
process.env.APP_ORIGIN = 'http://localhost:8085';
process.env.PRIVACY_NOTICE_VERSION = '2026-11-v1';

import { sanitizeCsvCell } from '../../api/admin.js';
import { createSessionCookie, verifyCsrfToken, generateCsrfToken } from '../../src/lib/session.js';

describe('Phase 3: Admin Auth & Hardening Verification', () => {
  it('generates secure __Host- session cookie with all required attributes', () => {
    const rawToken = 'super_secret_token_value_12345';
    const cookie = createSessionCookie(rawToken);

    expect(cookie).toContain('__Host-kaids_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
  });

  it('validates and verifies CSRF synchronizer tokens strictly in constant time', () => {
    const sessionId = 'session_test_abc123';
    const token = generateCsrfToken(sessionId);

    expect(verifyCsrfToken(sessionId, token)).toBe(true);
    expect(verifyCsrfToken(sessionId, 'tampered_token')).toBe(false);
    expect(verifyCsrfToken('different_session', token)).toBe(false);
  });

  it('neutralizes CSV formula injection attacks by prepending single quote to dangerous symbols', () => {
    const attack1 = '=HYPERLINK("http://evil.com")';
    const attack2 = '+123456';
    const attack3 = '-cmd|/C calc!A0';
    const attack4 = '@SUM(1,2)';
    const normal = 'Normal Company Name';

    expect(sanitizeCsvCell(attack1)).toBe(`'=HYPERLINK("http://evil.com")`);
    expect(sanitizeCsvCell(attack2)).toBe(`'+123456`);
    expect(sanitizeCsvCell(attack3)).toBe(`'-cmd|/C calc!A0`);
    expect(sanitizeCsvCell(attack4)).toBe(`'@SUM(1,2)`);
    expect(sanitizeCsvCell(normal)).toBe('Normal Company Name');
  });
});

