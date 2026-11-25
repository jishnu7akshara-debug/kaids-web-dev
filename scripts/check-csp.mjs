import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const ignoreDirs = new Set(['node_modules', '_source', 'docs', '.git', '.vercel', 'test-results', 'playwright-report', 'tests', 'scripts', 'build']);
const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.name.endsWith('.html')) {
      const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (/\bstyle\s*=|<style\b/i.test(line)) {
          hits.push(`${relPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (/setAttribute\s*\(\s*['"]style['"]|\.style\.cssText\b|\bstyle\s*=/i.test(line)) {
          hits.push(`${relPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

walk(rootDir);

// Check vercel.json
const vercelPath = path.join(rootDir, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercelContent = fs.readFileSync(vercelPath, 'utf8');
  if (/'unsafe-inline'|'unsafe-hashes'/i.test(vercelContent)) {
    hits.push(`vercel.json: contains 'unsafe-inline' or 'unsafe-hashes'`);
  }
}

if (hits.length > 0) {
  console.error('[FAIL] CSP inline-style check failed:');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}

console.log('[PASS] check:csp passed with 0 inline-style or CSP policy violations.');
