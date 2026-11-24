import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
import { neon } from '@neondatabase/serverless';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function injectClients(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const dbUrl = options.databaseUrl || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL is required to inject clients');
  }

  const sql = neon(dbUrl);

  const rows = await sql`
    SELECT id, name, location, logo_key, logo_w, logo_h, show_home_strip, show_logo_grid, show_name_list, sort_order, status, created_at
    FROM clients
    WHERE status = 'published' AND deleted_at IS NULL
    ORDER BY sort_order ASC, created_at DESC
  `;

  const indexPath = path.join(rootDir, 'index.html');
  const clientsPath = path.join(rootDir, 'clients.html');

  let indexHtml = fs.readFileSync(indexPath, 'utf-8');
  let clientsHtml = fs.readFileSync(clientsPath, 'utf-8');

  // 1. Home Strip
  const homeStripClients = rows.filter(r => r.show_home_strip && r.logo_key);
  const homeStripHtml = [
    '<!-- clients:home-strip:start -->',
    ...homeStripClients.map(c => `          <li><img src="${escapeHtml(c.logo_key)}" width="${c.logo_w || 200}" height="${c.logo_h || 100}" loading="lazy" alt="${escapeHtml(c.name)}"></li>`),
    '<!-- clients:home-strip:end -->'
  ].join('\n');

  // 2. Home Names
  const homeNameClients = rows.filter(r => !r.show_home_strip && r.show_name_list).slice(0, 15);
  const homeNamesHtml = [
    '<!-- clients:home-names:start -->',
    ...homeNameClients.map(c => `          <li>${escapeHtml(c.name)}</li>`),
    '<!-- clients:home-names:end -->'
  ].join('\n');

  // 3. Logo Grid
  const logoGridClients = rows.filter(r => r.show_logo_grid && r.logo_key);
  const logoGridHtml = [
    '<!-- clients:logo-grid:start -->',
    ...logoGridClients.map(c => `        <li data-reveal><img src="${escapeHtml(c.logo_key)}" width="${c.logo_w || 200}" height="${c.logo_h || 100}" loading="lazy" alt="">\n          <p class="note">${escapeHtml(c.name)}</p>\n        </li>`),
    '<!-- clients:logo-grid:end -->'
  ].join('\n');

  // 4. Name List
  const nameListClients = rows.filter(r => r.show_name_list);
  const nameListHtml = [
    '<!-- clients:name-list:start -->',
    ...nameListClients.map(c => `          <li data-client>${escapeHtml(c.name)}${c.location ? ` <span class="note">${escapeHtml(c.location)}</span>` : ''}</li>`),
    '<!-- clients:name-list:end -->'
  ].join('\n');

  // Inject into index.html
  indexHtml = indexHtml.replace(/<!-- clients:home-strip:start -->[\s\S]*?<!-- clients:home-strip:end -->/, homeStripHtml);
  indexHtml = indexHtml.replace(/<!-- clients:home-names:start -->[\s\S]*?<!-- clients:home-names:end -->/, homeNamesHtml);

  // Inject into clients.html
  clientsHtml = clientsHtml.replace(/<!-- clients:logo-grid:start -->[\s\S]*?<!-- clients:logo-grid:end -->/, logoGridHtml);
  clientsHtml = clientsHtml.replace(/<!-- clients:name-list:start -->[\s\S]*?<!-- clients:name-list:end -->/, nameListHtml);

  // Update client count in clients.html
  const countRegex = /<p class="note" data-client-count[^>]*>.*?<\/p>/;
  if (countRegex.test(clientsHtml)) {
    clientsHtml = clientsHtml.replace(countRegex, `<p class="note" data-client-count role="status" aria-live="polite">${nameListClients.length} clients listed</p>`);
  }

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');
  fs.writeFileSync(clientsPath, clientsHtml, 'utf-8');

  return {
    success: true,
    totalClients: rows.length,
    homeStripCount: homeStripClients.length,
    homeNamesCount: homeNameClients.length,
    logoGridCount: logoGridClients.length,
    nameListCount: nameListClients.length,
    updatedFiles: ['index.html', 'clients.html']
  };
}

// Allow running directly via CLI
if (process.argv[1] && process.argv[1].endsWith('inject-clients.mjs')) {
  injectClients()
    .then(res => {
      console.log('Client injection completed successfully:');
      console.log(JSON.stringify(res, null, 2));
    })
    .catch(err => {
      console.error('Client injection failed:', err);
      process.exit(1);
    });
}
