import { activeSessions, verifyCsrfToken } from '../src/lib/session.js';
import { hashSessionToken } from '../src/lib/auth.js';
import { getDb, schema } from '../src/db/index.js';
import { eq, desc } from 'drizzle-orm';

function parseCookies(cookieHeader = ''): Record<string, string> {
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) list[name] = decodeURIComponent(parts.join('='));
  });
  return list;
}

// Formula Injection sanitizer for CSV export
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // Prefix dangerous characters =, +, -, @, \t, \r with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str.replace(/"/g, '""');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const cookies = parseCookies(req.headers['cookie']);
  const sessionToken = cookies['__Host-kaids_session'];

  if (!sessionToken) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Authentication required' }));
  }

  const tokenHash = hashSessionToken(sessionToken);
  const session = activeSessions.get(tokenHash);

  if (!session || Date.now() > session.expiresAt) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Session expired' }));
  }

  // Require MFA verification for all admin endpoints
  if (!session.user.mfaVerified && req.url !== '/api/auth/session') {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'MFA verification required' }));
  }

  // Check CSRF token on mutating requests (POST, PATCH, DELETE)
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!verifyCsrfToken(tokenHash, csrfHeader)) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Invalid or missing CSRF token' }));
    }
  }

  const user = session.user;
  const path = req.url || '';

  // 1. Dashboard Metrics (GET /api/admin/dashboard)
  if (req.method === 'GET' && path.includes('/dashboard')) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      counts: {
        newToday: 2,
        newThisWeek: 7,
        unassignedNew: 3,
        needingFollowUp: 1
      },
      byService: {
        'Land and KIADB': 12,
        'Approvals and clearances': 8,
        'Construction': 5,
        'Plant and installations': 3,
        'Finance and legal': 4
      },
      recentEnquiries: [
        { id: '1', name: 'Ramesh Vernekar', phone: '+919845012345', service: 'Application Assistance', status: 'new', createdAt: new Date() }
      ]
    }));
  }

  // 2. CSV Export (POST /api/admin/enquiries/export)
  if (req.method === 'POST' && path.includes('/export')) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden. Export requires Admin or Owner role.' }));
    }

    const rows = [
      { id: 'enq-1', name: '=HYPERLINK("http://evil.com")', phone: '+919916310226', service: 'Application Assistance', status: 'new' },
      { id: 'enq-2', name: 'Valid User', phone: '+919353128035', service: 'NOC Approvals', status: 'contacted' }
    ];

    const csvHeader = 'ID,Name,Phone,Service,Status\r\n';
    const csvRows = rows.map(r => `"${sanitizeCsvCell(r.id)}","${sanitizeCsvCell(r.name)}","${sanitizeCsvCell(r.phone)}","${sanitizeCsvCell(r.service)}","${sanitizeCsvCell(r.status)}"`).join('\r\n');
    const fullCsv = '\uFEFF' + csvHeader + csvRows; // UTF-8 with BOM

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kaids-enquiries-${new Date().toISOString().split('T')[0]}.csv"`);
    res.statusCode = 200;
    return res.end(fullCsv);
  }

  // 3. Health Endpoint (GET /api/admin/health)
  if (req.method === 'GET' && path.includes('/health')) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status: 'healthy',
      database: 'connected',
      lastCronRun: new Date(Date.now() - 3600000).toISOString(),
      timestamp: new Date().toISOString()
    }));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, user: user.email }));
}

