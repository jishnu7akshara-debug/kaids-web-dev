import { describe, it, expect, vi } from 'vitest';
import handler from '../../api/enquiries.js';

// Setup environment for testing
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

function createMockReqRes(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const req: any = {
    method: options.method || 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:8085',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'x-forwarded-for': '203.0.113.195',
      ...options.headers
    },
    body: options.body
  };

  const res: any = {
    statusCode: 200,
    headers: {},
    data: '',
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = v;
    },
    end(chunk?: string) {
      if (chunk) this.data += chunk;
      return this;
    }
  };

  return { req, res };
}

describe('POST /api/enquiries API Processing Pipeline', () => {
  it('rejects foreign origins with 403 Forbidden', async () => {
    const { req, res } = createMockReqRes({
      headers: { origin: 'https://malicious-attacker.com' },
      body: {}
    });

    await handler(req, res);
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.data);
    expect(body.error).toBe('Forbidden Origin');
  });

  it('rejects non-JSON content-types with 415 Unsupported Media Type', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'content-type': 'text/plain' },
      body: 'plain text content'
    });

    await handler(req, res);
    expect(res.statusCode).toBe(415);
  });

  it('rejects bodies exceeding 8 KB with 413 Payload Too Large', async () => {
    const largeMessage = 'x'.repeat(9000);
    const { req, res } = createMockReqRes({
      body: JSON.stringify({ message: largeMessage })
    });

    await handler(req, res);
    expect(res.statusCode).toBe(413);
  });

  it('silently filters honeypot bots returning 200 without error', async () => {
    const { req, res } = createMockReqRes({
      body: {
        name: 'Bot Spammer',
        phone: '9916310226',
        website: 'https://spam-link.ru',
        consent: true
      }
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.data);
    expect(body.ok).toBe(true);
    expect(body.id).toBe('hp-filtered');
  });

  it('silently filters timing bots submitted in under 3 seconds', async () => {
    const { req, res } = createMockReqRes({
      body: {
        name: 'Fast Bot',
        phone: '9916310226',
        startedAt: Date.now() - 500, // 500ms elapsed
        consent: true
      }
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.data);
    expect(body.ok).toBe(true);
    expect(body.id).toBe('timing-filtered');
  });

  it('returns 422 with field-specific errors when validation fails', async () => {
    const { req, res } = createMockReqRes({
      body: {
        name: 'A', // Too short (min 2)
        phone: '123', // Invalid digits
        consent: false // Must be true
      }
    });

    await handler(req, res);
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.data);
    expect(body.errors).toHaveProperty('name', 'Enter your name.');
    expect(body.errors).toHaveProperty('phone', 'Enter a phone number with at least 10 digits.');
    expect(body.errors).toHaveProperty('consent', 'Tick the box to let us use your details to reply.');
  });

  it('successfully validates a legitimate enquiry submission and sets Cache-Control: no-store', async () => {
    const { req, res } = createMockReqRes({
      body: {
        name: 'Ramesh Vernekar',
        phone: '9845012345',
        email: 'ramesh@example.com',
        company: 'Vernekar Industries',
        service: 'Application Assistance',
        message: 'Need help with KIADB land allotment in Harohalli.',
        consent: true,
        startedAt: Date.now() - 5000 // 5 seconds elapsed
      }
    });

    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = JSON.parse(res.data);
    expect(body.ok).toBe(true);
    expect(body.id).toBeDefined();
  });
});
