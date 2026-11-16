import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

import enquiriesHandler from './api/enquiries.js';
import authHandler from './api/auth.js';
import adminHandler from './api/admin.js';
import retentionHandler from './api/cron/retention.js';

const PORT = 8085;
const PUBLIC_DIR = process.cwd();

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || '/';
  const pathname = reqUrl.split('?')[0];

  // API Routes
  if (pathname === '/api/enquiries' || pathname.startsWith('/api/enquiries/')) {
    try {
      await enquiriesHandler(req, res);
    } catch (err: any) {
      console.error('[API ERROR /api/enquiries]', err);
      if (!res.headersSent) {
        res.statusCode = err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
    return;
  }

  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    try {
      await authHandler(req, res);
    } catch (err: any) {
      console.error('[API ERROR /api/auth]', err);
      if (!res.headersSent) {
        res.statusCode = err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
    return;
  }

  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    try {
      await adminHandler(req, res);
    } catch (err: any) {
      console.error('[API ERROR /api/admin]', err);
      if (!res.headersSent) {
        res.statusCode = err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
    return;
  }

  if (pathname === '/api/cron/retention' || pathname.startsWith('/api/cron/')) {
    try {
      await retentionHandler(req, res);
    } catch (err: any) {
      console.error('[API ERROR /api/cron]', err);
      if (!res.headersSent) {
        res.statusCode = err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
    return;
  }

  // Static File Serving
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  // Sanitize path against directory traversal
  let safePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  // If path is a directory, look for index.html
  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    safePath = path.join(safePath, 'index.html');
  }

  if (!fs.existsSync(safePath)) {
    // Serve 404 page
    const notFoundPath = path.join(PUBLIC_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return fs.createReadStream(notFoundPath).pipe(res);
    }
    res.statusCode = 404;
    return res.end('Not Found');
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  // Add security headers to match vercel.json in dev
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  fs.createReadStream(safePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[KAIDS DEV SERVER] Running at http://localhost:${PORT}/ (Static files + Live /api/* endpoints)`);
});
