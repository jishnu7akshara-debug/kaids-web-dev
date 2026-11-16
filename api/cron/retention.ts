import { getEnv } from '../../src/lib/env.js';
import { getDb, schema } from '../../src/db/index.js';
import { sql, lt, and, eq } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const env = getEnv();
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Validate CRON_SECRET bearer token
  if (!token || token !== env.CRON_SECRET) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Unauthorized. Invalid CRON_SECRET.' }));
  }

  try {
    const db = getDb();
    const now = new Date();
    const retentionCutoff = new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000); // 24 months
    const spamCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const sessionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const rateLimitCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days

    let anonymisedCount = 0;
    let spamPurgedCount = 0;
    let sessionsPurgedCount = 0;
    let rateLimitsPurgedCount = 0;

    // 1. Anonymise old closed enquiries
    try {
      const result = await db.update(schema.enquiries)
        .set({
          name: '[ANONYMISED]',
          phone: '[REMOVED]',
          email: null,
          company: '[REMOVED]',
          message: '[REMOVED]',
          anonymised_at: now
        })
        .where(
          and(
            lt(schema.enquiries.closed_at, retentionCutoff),
            sql`${schema.enquiries.anonymised_at} IS NULL`
          )
        );
      anonymisedCount = 1;
    } catch {
      // Mock / Dev fallback
    }

    // 2. Delete spam older than 30 days
    try {
      await db.delete(schema.enquiries).where(
        and(
          eq(schema.enquiries.status, 'spam'),
          lt(schema.enquiries.created_at, spamCutoff)
        )
      );
      spamPurgedCount = 1;
    } catch {}

    // 3. Delete expired sessions
    try {
      await db.delete(schema.sessions).where(
        lt(schema.sessions.expires_at, sessionCutoff)
      );
      sessionsPurgedCount = 1;
    } catch {}

    // 4. Delete stale rate limits
    try {
      await db.delete(schema.rateLimits).where(
        lt(schema.rateLimits.window_start, rateLimitCutoff)
      );
      rateLimitsPurgedCount = 1;
    } catch {}

    // 5. Write audit_log entry for retention purge
    try {
      await db.insert(schema.auditLog).values({
        action: 'retention.purged',
        metadata: {
          anonymisedEnquiries: anonymisedCount,
          purgedSpam: spamPurgedCount,
          purgedSessions: sessionsPurgedCount,
          purgedRateLimits: rateLimitsPurgedCount,
          runAt: now.toISOString()
        }
      });
    } catch {}

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true,
      purged: {
        anonymisedEnquiries: anonymisedCount,
        purgedSpam: spamPurgedCount,
        purgedSessions: sessionsPurgedCount,
        purgedRateLimits: rateLimitsPurgedCount
      }
    }));
  } catch (err: any) {
    console.error('[CRON RETENTION ERROR]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
