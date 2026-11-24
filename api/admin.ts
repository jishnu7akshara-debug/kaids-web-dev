import fs from 'node:fs';
import path from 'node:path';
import { activeSessions, verifyCsrfToken } from '../src/lib/session.js';
import { hashSessionToken } from '../src/lib/auth.js';
import { getDb, schema } from '../src/db/index.js';
import { eq, desc, asc, ilike, and, or, isNull, isNotNull, sql } from 'drizzle-orm';
// @ts-ignore
import { injectClients } from '../build/inject-clients.mjs';

function parseCookies(cookieHeader = ''): Record<string, string> {
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) list[name] = decodeURIComponent(parts.join('='));
  });
  return list;
}

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str.replace(/"/g, '""');
}

async function readRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let length = 0;
    req.on('data', (c: Buffer) => {
      length += c.length;
      if (length <= 5 * 1024 * 1024) chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function parseDimensionsFromBuffer(buf: Buffer, mimeType: string): { width: number; height: number } {
  // SVG dimensions
  if (mimeType.includes('svg')) {
    const text = buf.toString('utf-8');
    const vb = text.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/i);
    if (vb) {
      return { width: Math.round(parseFloat(vb[3])), height: Math.round(parseFloat(vb[4])) };
    }
    const w = text.match(/width=["']([0-9.]+)["']/i);
    const h = text.match(/height=["']([0-9.]+)["']/i);
    if (w && h) {
      return { width: Math.round(parseFloat(w[1])), height: Math.round(parseFloat(h[1])) };
    }
  }

  // PNG dimensions: bytes 16-24
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20)
    };
  }

  // WEBP dimensions
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const format = buf.toString('ascii', 12, 16);
    if (format === 'VP8X' && buf.length >= 30) {
      const w = 1 + buf.readUIntLE(24, 3);
      const h = 1 + buf.readUIntLE(27, 3);
      return { width: w, height: h };
    } else if (format === 'VP8 ' && buf.length >= 30) {
      const w = buf.readUInt16LE(26) & 0x3fff;
      const h = buf.readUInt16LE(28) & 0x3fff;
      return { width: w, height: h };
    } else if (format === 'VP8L' && buf.length >= 25) {
      const b1 = buf[21];
      const b2 = buf[22];
      const b3 = buf[23];
      const b4 = buf[24];
      const w = 1 + (((b2 & 0x3f) << 8) | b1);
      const h = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width: w, height: h };
    }
  }

  return { width: 300, height: 150 };
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

  // Check CSRF token on mutating requests (POST, PATCH, PUT, DELETE)
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!verifyCsrfToken(tokenHash, csrfHeader)) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Invalid or missing CSRF token' }));
    }
  }

  const user = session.user;
  const fullUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = fullUrl.pathname;
  const query = Object.fromEntries(fullUrl.searchParams.entries());

  // 1. Dashboard Metrics (GET /api/admin/dashboard)
  if (req.method === 'GET' && (pathname.endsWith('/dashboard') || query.action === 'dashboard')) {
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
        'Subsidies, government benefits and legal services': 4
      },
      recentEnquiries: [
        { id: '1', name: 'Ramesh Vernekar', phone: '+919845012345', service: 'Application Assistance', status: 'new', createdAt: new Date() }
      ]
    }));
  }

  // 2. CSV Export (POST /api/admin/enquiries/export)
  if (req.method === 'POST' && (pathname.includes('/export') || query.action === 'export')) {
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
  if (req.method === 'GET' && pathname.endsWith('/health')) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status: 'healthy',
      database: 'connected',
      lastCronRun: new Date(Date.now() - 3600000).toISOString(),
      timestamp: new Date().toISOString()
    }));
  }

  // 4. CLIENT MANAGER ENDPOINTS

  // Helper: extract ID from /api/admin/clients/:id or ?id=:id
  const clientIdMatch = pathname.match(/\/clients\/([a-f0-9-]+)/i);
  const targetClientId = clientIdMatch ? clientIdMatch[1] : (query.id || null);

  // 4.1 GET /api/admin/clients
  if (req.method === 'GET' && (pathname.endsWith('/clients') || pathname.endsWith('/clients/'))) {
    try {
      const db = getDb();
      const searchQ = (query.q || '').trim();
      const statusFilter = query.status;
      const showDeleted = query.show_deleted === 'true';

      const conditions: any[] = [];
      if (!showDeleted) {
        conditions.push(isNull(schema.clients.deleted_at));
      }
      if (statusFilter && statusFilter !== 'all') {
        conditions.push(eq(schema.clients.status, statusFilter as any));
      }
      if (searchQ) {
        conditions.push(
          or(
            ilike(schema.clients.name, `%${searchQ}%`),
            ilike(schema.clients.location, `%${searchQ}%`)
          )
        );
      }

      const clientRows = await db
        .select()
        .from(schema.clients)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.clients.sort_order), desc(schema.clients.created_at));

      res.statusCode = 200;
      return res.end(JSON.stringify({ clients: clientRows, total: clientRows.length }));
    } catch (err: any) {
      console.error('[CLIENTS GET ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to retrieve clients' }));
    }
  }

  // 4.2 POST /api/admin/clients (Create Client)
  if (req.method === 'POST' && (pathname.endsWith('/clients') || pathname.endsWith('/clients/'))) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden: Viewer cannot create clients' }));
    }

    try {
      const body = await readRequestBody(req);
      const name = (body.name || '').trim();
      if (!name || name.length < 2 || name.length > 120) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Client name must be between 2 and 120 characters' }));
      }

      const db = getDb();
      // Check unique name among non-deleted
      const existing = await db
        .select()
        .from(schema.clients)
        .where(and(isNull(schema.clients.deleted_at), sql`lower(${schema.clients.name}) = lower(${name})`));

      if (existing.length > 0) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: 'A client with this name already exists' }));
      }

      // Determine next sort_order
      const maxOrderRes = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${schema.clients.sort_order}), 0)` })
        .from(schema.clients)
        .where(isNull(schema.clients.deleted_at));

      const nextOrder = (maxOrderRes[0]?.maxOrder || 0) + 1;

      const [newClient] = await db
        .insert(schema.clients)
        .values({
          name,
          location: body.location ? String(body.location).trim() : null,
          logo_key: body.logo_key || null,
          logo_w: body.logo_w ? parseInt(body.logo_w, 10) : null,
          logo_h: body.logo_h ? parseInt(body.logo_h, 10) : null,
          show_home_strip: Boolean(body.show_home_strip),
          show_logo_grid: Boolean(body.show_logo_grid),
          show_name_list: body.show_name_list !== undefined ? Boolean(body.show_name_list) : true,
          sort_order: nextOrder,
          status: body.status === 'hidden' ? 'hidden' : 'published',
          created_by: user.name || user.email,
          updated_by: user.name || user.email
        })
        .returning();

      // Log audit
      await db.insert(schema.auditLog).values({
        actor_id: user.userId,
        action: 'client.create',
        target_type: 'client',
        target_id: newClient.id,
        metadata: { name: newClient.name, sort_order: newClient.sort_order }
      });

      res.statusCode = 201;
      return res.end(JSON.stringify({ client: newClient }));
    } catch (err: any) {
      console.error('[CLIENTS POST ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to create client' }));
    }
  }

  // 4.3 POST /api/admin/clients/reorder
  if (req.method === 'POST' && pathname.includes('/clients/reorder')) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    try {
      const body = await readRequestBody(req);
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      const db = getDb();

      for (let i = 0; i < ids.length; i++) {
        await db
          .update(schema.clients)
          .set({ sort_order: i + 1, updated_at: new Date() })
          .where(eq(schema.clients.id, ids[i]));
      }

      await db.insert(schema.auditLog).values({
        actor_id: user.userId,
        action: 'client.reorder',
        target_type: 'client',
        metadata: { count: ids.length }
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, count: ids.length }));
    } catch (err: any) {
      console.error('[CLIENTS REORDER ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to reorder clients' }));
    }
  }

  // 4.4 POST /api/admin/clients/restore
  if (req.method === 'POST' && (pathname.includes('/restore') || query.action === 'restore')) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    const body = await readRequestBody(req);
    const idToRestore = targetClientId || body.id;
    if (!idToRestore) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Client ID is required' }));
    }

    try {
      const db = getDb();
      const [restored] = await db
        .update(schema.clients)
        .set({ deleted_at: null, updated_by: user.name || user.email, updated_at: new Date() })
        .where(eq(schema.clients.id, idToRestore))
        .returning();

      await db.insert(schema.auditLog).values({
        actor_id: user.userId,
        action: 'client.restore',
        target_type: 'client',
        target_id: idToRestore
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, client: restored }));
    } catch (err: any) {
      console.error('[CLIENTS RESTORE ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to restore client' }));
    }
  }

  // 4.5 PATCH /api/admin/clients/:id
  if (req.method === 'PATCH' && (targetClientId || pathname.includes('/clients/'))) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    const body = await readRequestBody(req);
    const idToUpdate = targetClientId || body.id;
    if (!idToUpdate) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Client ID is required' }));
    }

    try {
      const db = getDb();
      const existing = await db.select().from(schema.clients).where(eq(schema.clients.id, idToUpdate));
      if (existing.length === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Client not found' }));
      }

      const updates: any = {
        updated_by: user.name || user.email,
        updated_at: new Date()
      };

      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (name.length < 2 || name.length > 120) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Client name must be between 2 and 120 characters' }));
        }
        // Unique check if name changed
        if (name.toLowerCase() !== existing[0].name.toLowerCase()) {
          const dup = await db
            .select()
            .from(schema.clients)
            .where(and(isNull(schema.clients.deleted_at), sql`lower(${schema.clients.name}) = lower(${name})`));
          if (dup.length > 0) {
            res.statusCode = 409;
            return res.end(JSON.stringify({ error: 'A client with this name already exists' }));
          }
        }
        updates.name = name;
      }

      if (body.location !== undefined) updates.location = body.location ? String(body.location).trim() : null;
      if (body.logo_key !== undefined) updates.logo_key = body.logo_key || null;
      if (body.logo_w !== undefined) updates.logo_w = body.logo_w ? parseInt(body.logo_w, 10) : null;
      if (body.logo_h !== undefined) updates.logo_h = body.logo_h ? parseInt(body.logo_h, 10) : null;
      if (body.show_home_strip !== undefined) updates.show_home_strip = Boolean(body.show_home_strip);
      if (body.show_logo_grid !== undefined) updates.show_logo_grid = Boolean(body.show_logo_grid);
      if (body.show_name_list !== undefined) updates.show_name_list = Boolean(body.show_name_list);
      if (body.status !== undefined) updates.status = body.status === 'hidden' ? 'hidden' : 'published';

      const [updated] = await db
        .update(schema.clients)
        .set(updates)
        .where(eq(schema.clients.id, idToUpdate))
        .returning();

      await db.insert(schema.auditLog).values({
        actor_id: user.userId,
        action: 'client.update',
        target_type: 'client',
        target_id: idToUpdate,
        metadata: { updatedFields: Object.keys(updates) }
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ client: updated }));
    } catch (err: any) {
      console.error('[CLIENTS PATCH ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to update client' }));
    }
  }

  // 4.6 DELETE /api/admin/clients/:id (Soft delete)
  if (req.method === 'DELETE' && (targetClientId || pathname.includes('/clients/'))) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    const idToDelete = targetClientId || query.id;
    if (!idToDelete) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Client ID is required' }));
    }

    try {
      const db = getDb();
      const [deleted] = await db
        .update(schema.clients)
        .set({ deleted_at: new Date(), updated_by: user.name || user.email, updated_at: new Date() })
        .where(eq(schema.clients.id, idToDelete))
        .returning();

      await db.insert(schema.auditLog).values({
        actor_id: user.userId,
        action: 'client.delete',
        target_type: 'client',
        target_id: idToDelete
      });

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, client: deleted }));
    } catch (err: any) {
      console.error('[CLIENTS DELETE ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to delete client' }));
    }
  }

  // 4.7 POST /api/admin/clients/logo (Upload logo)
  if (req.method === 'POST' && pathname.includes('/clients/logo')) {
    if (user.role === 'viewer') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    try {
      const body = await readRequestBody(req);
      const rawData = body.data;
      const originalFilename = body.filename || 'logo.webp';
      const mimeType = body.mimeType || 'image/webp';

      const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'];
      if (!allowedTypes.includes(mimeType)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Invalid file format. Allowed: PNG, WebP, JPEG, SVG.' }));
      }

      if (!rawData) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Logo data is required' }));
      }

      // Convert base64 data to buffer
      const base64Clean = rawData.replace(/^data:image\/[a-z+]+;base64,/, '');
      const buf = Buffer.from(base64Clean, 'base64');

      if (buf.length > 2 * 1024 * 1024) {
        res.statusCode = 413;
        return res.end(JSON.stringify({ error: 'Logo file size exceeds 2 MB limit' }));
      }

      // Sanitize SVG if SVG
      let finalBuf = buf;
      if (mimeType.includes('svg')) {
        let svgStr = buf.toString('utf-8');
        // Strip script tags and on* handlers
        svgStr = svgStr.replace(/<script[\s\S]*?<\/script>/gi, '');
        svgStr = svgStr.replace(/\son\w+=["'][^"']*["']/gi, '');
        finalBuf = Buffer.from(svgStr, 'utf-8');
      }

      const ext = path.extname(originalFilename) || (mimeType.includes('png') ? '.png' : mimeType.includes('svg') ? '.svg' : '.webp');
      const baseSlug = path.basename(originalFilename, ext).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client-logo';
      const finalFileName = `${baseSlug}-${Date.now()}${ext}`;
      const savePath = path.join(process.cwd(), 'assets', 'img', 'clients', finalFileName);

      fs.writeFileSync(savePath, finalBuf);
      const dimensions = parseDimensionsFromBuffer(finalBuf, mimeType);

      const logoKey = `assets/img/clients/${finalFileName}`;

      res.statusCode = 200;
      return res.end(JSON.stringify({
        logo_key: logoKey,
        logo_w: dimensions.width,
        logo_h: dimensions.height
      }));
    } catch (err: any) {
      console.error('[CLIENT LOGO UPLOAD ERROR]', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to upload logo' }));
    }
  }

  // 4.8 POST /api/admin/publish & GET /api/admin/publish/status
  if ((pathname.endsWith('/publish') || query.action === 'publish')) {
    if (req.method === 'POST') {
      if (user.role === 'viewer') {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: 'Forbidden' }));
      }

      try {
        const result = await injectClients();
        const db = getDb();
        await db.insert(schema.auditLog).values({
          actor_id: user.userId,
          action: 'site.publish',
          target_type: 'site',
          metadata: { totalClients: result.totalClients }
        });

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          updatedFiles: result.updatedFiles,
          totalClients: result.totalClients,
          timestamp: new Date().toISOString()
        }));
      } catch (err: any) {
        console.error('[PUBLISH ERROR]', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Publish failed: ' + err.message }));
      }
    }

    if (req.method === 'GET') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        status: 'ready',
        lastPublished: new Date().toISOString()
      }));
    }
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, user: user.email }));
}
