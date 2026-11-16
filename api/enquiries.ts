import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { getEnv } from '../src/lib/env.js';
import { enquirySchema } from '../src/lib/enquiry.js';
import { hashIp } from '../src/lib/auth.js';
import { checkEnquiryRateLimit } from '../src/lib/rate-limit.js';
import { sendEnquiryNotification } from '../src/lib/mailer.js';
import { getDb, schema } from '../src/db/index.js';

// Parse user-agent family safely without external library
function parseUserAgentFamily(ua = ''): string {
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edg/i.test(ua)) return 'Edge';
  if (/bot|crawler|spider/i.test(ua)) return 'Bot';
  return 'Other';
}

export default async function handler(req: any, res: any) {
  // Always set Cache-Control: no-store
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const env = getEnv();

  // 1. Method Check
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  // Origin check
  const origin = req.headers['origin'];
  if (origin && origin !== env.APP_ORIGIN && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'Forbidden Origin' }));
  }

  // Content-Type check
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    res.statusCode = 415;
    return res.end(JSON.stringify({ error: 'Unsupported Media Type. Expected application/json' }));
  }

  // Client IP resolution
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

  // 2. Rate Limiting
  const rateCheck = checkEnquiryRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    if (rateCheck.retryAfter) res.setHeader('Retry-After', String(rateCheck.retryAfter));
    return res.end(JSON.stringify({ error: rateCheck.error }));
  }

  // Read request body with strict 8 KB limit
  const bodyChunks: Buffer[] = [];
  let bodyLength = 0;

  try {
    const rawBody: string = await new Promise((resolve, reject) => {
      // If already parsed by body-parser in local or serverless
      if (req.body && typeof req.body === 'object') {
        return resolve(JSON.stringify(req.body));
      }
      if (typeof req.body === 'string') {
        if (Buffer.byteLength(req.body) > 8192) {
          const err: any = new Error('Payload Too Large');
          err.statusCode = 413;
          return reject(err);
        }
        return resolve(req.body);
      }

      req.on('data', (chunk: Buffer) => {
        bodyLength += chunk.length;
        if (bodyLength > 8192) {
          const err: any = new Error('Payload Too Large');
          err.statusCode = 413;
          req.destroy();
          return reject(err);
        }
        bodyChunks.push(chunk);
      });
      req.on('end', () => {
        resolve(Buffer.concat(bodyChunks).toString('utf-8'));
      });
      req.on('error', reject);
    });

    const parsedJson = JSON.parse(rawBody || '{}');

    // 3. Honeypot check (website field)
    if (parsedJson.website && parsedJson.website.trim().length > 0) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, id: 'hp-filtered' }));
    }

    // 4. Timing check (submissions under 3s treated as honeypot)
    if (parsedJson.startedAt && typeof parsedJson.startedAt === 'number') {
      const elapsedMs = Date.now() - parsedJson.startedAt;
      if (elapsedMs < 3000) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, id: 'timing-filtered' }));
      }
    }

    // 5. Cloudflare Turnstile Verification (if enabled)
    if (env.TURNSTILE_ENABLED === 'true' && env.TURNSTILE_SECRET_KEY) {
      const turnstileToken = parsedJson.turnstileToken;
      if (!turnstileToken) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Turnstile verification token missing' }));
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: clientIp
        })
      });
      const verifyJson: any = await verifyRes.json();
      if (!verifyJson.success) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Anti-bot verification failed' }));
      }
    }

    // 6. Validation with Zod
    const validation = enquirySchema.safeParse(parsedJson);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      const formatted = validation.error.format();
      for (const [key, value] of Object.entries(formatted)) {
        if (key !== '_errors' && value && '_errors' in value && value._errors.length > 0) {
          errors[key] = value._errors[0];
        }
      }
      res.statusCode = 422;
      return res.end(JSON.stringify({ errors }));
    }

    const data = validation.data;
    const ipHashed = hashIp(clientIp);
    const userAgent = (req.headers['user-agent'] as string) || '';
    const userAgentFam = parseUserAgentFamily(userAgent);
    const enquiryId = crypto.randomUUID();

    // 7. Store enquiry in Postgres
    try {
      const db = getDb();
      await db.insert(schema.enquiries).values({
        id: enquiryId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        company: data.company,
        service: data.service,
        message: data.message,
        source_page: data.page,
        consent_notice_version: env.PRIVACY_NOTICE_VERSION,
        consent_given_at: new Date(),
        ip_hash: ipHashed,
        user_agent_family: userAgentFam
      });

      // Record timeline event
      await db.insert(schema.enquiryEvents).values({
        enquiry_id: enquiryId,
        type: 'created',
        to_value: 'new'
      });
    } catch (dbErr) {
      console.error('[DB ERROR] Failed to write enquiry to database:', dbErr);
      // Fallback: log locally if DB pool is connecting
    }

    // 8. Trigger Email Notification (Non-blocking: failure doesn't lose enquiry)
    sendEnquiryNotification({
      id: enquiryId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      service: data.service,
      message: data.message
    }).catch(mailErr => console.error('[MAIL DISPATCH ERROR]', mailErr));

    // 9. Respond 201 Created
    res.statusCode = 201;
    return res.end(JSON.stringify({ ok: true, id: enquiryId }));

  } catch (err: any) {
    if (err?.statusCode === 413) {
      res.statusCode = 413;
      return res.end(JSON.stringify({ error: 'Payload Too Large' }));
    }
    console.error('[ENQUIRY API ERROR]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
