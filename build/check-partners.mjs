import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const partnersPath = path.join(rootDir, 'assets', 'data', 'partners.json');

if (!fs.existsSync(partnersPath)) {
  console.error('[ERROR] partners.json not found at', partnersPath);
  process.exit(1);
}

const partners = JSON.parse(fs.readFileSync(partnersPath, 'utf-8'));
const requiredFields = ['slug', 'name', 'title', 'cardLine', 'bio', 'image'];
let hasErrors = false;

for (const p of partners) {
  for (const field of requiredFields) {
    if (!p[field]) {
      console.error(`[ERROR] Partner ${p.slug || p.name || 'unknown'} missing required field: ${field}`);
      hasErrors = true;
    }
  }

  // Check referenced image files
  if (p.image && p.image.base) {
    const requiredVariants = [
      `${p.image.base}-480.webp`,
      `${p.image.base}-800.webp`,
      `${p.image.base}-1200.webp`,
      `${p.image.base}-480.avif`,
      `${p.image.base}-800.avif`,
      `${p.image.base}-1200.avif`,
      `${p.image.base}-800.jpg`
    ];

    for (const v of requiredVariants) {
      const fullPath = path.join(rootDir, v);
      if (!fs.existsSync(fullPath)) {
        console.error(`[ERROR] Image variant does not exist: ${v}`);
        hasErrors = true;
      }
    }
  }
}

// Check OG social card
const ogPath = path.join(rootDir, 'assets', 'img', 'partners-og.jpg');
if (!fs.existsSync(ogPath)) {
  console.error('[ERROR] OG social image not found at assets/img/partners-og.jpg');
  hasErrors = true;
}

// Check sitemap.xml
const sitemapPath = path.join(rootDir, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('[ERROR] sitemap.xml not found');
  hasErrors = true;
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  if (!sitemapContent.includes('https://www.kaids.in/partners')) {
    console.error('[ERROR] sitemap.xml does not include https://www.kaids.in/partners');
    hasErrors = true;
  }
}

// Check names in index.html and partners.html if they exist
const indexHtmlPath = path.join(rootDir, 'index.html');
const partnersHtmlPath = path.join(rootDir, 'partners.html');

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  if (indexHtml.includes('id="partners"')) {
    for (const p of partners) {
      if (!indexHtml.includes(p.name)) {
        console.error(`[ERROR] Partner name "${p.name}" not found in index.html`);
        hasErrors = true;
      }
    }
  }
  if (!indexHtml.includes('https://www.kaids.in/#org')) {
    console.error('[ERROR] index.html schema missing @id https://www.kaids.in/#org');
    hasErrors = true;
  }
}

if (fs.existsSync(partnersHtmlPath)) {
  const partnersHtml = fs.readFileSync(partnersHtmlPath, 'utf-8');
  for (const p of partners) {
    if (!partnersHtml.includes(p.name)) {
      console.error(`[ERROR] Partner name "${p.name}" not found in partners.html`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('[FAIL] Partners verification failed.');
  process.exit(1);
} else {
  console.log('[PASS] Partners data, images, OG card, sitemap, and HTML consistency verified successfully.');
}
