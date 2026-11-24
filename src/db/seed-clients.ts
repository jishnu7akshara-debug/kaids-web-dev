import dotenv from 'dotenv';
dotenv.config();
import fs from 'node:fs';
import { Pool } from '@neondatabase/serverless';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 15 Featured logos in order
  const featuredLogos = [
    { name: 'GoGas', logo_key: 'assets/img/clients/gogas.webp', logo_w: 247, logo_h: 247 },
    { name: 'Hotel Paraag', logo_key: 'assets/img/clients/paraag.webp', logo_w: 285, logo_h: 154 },
    { name: 'Upkar Developers', logo_key: 'assets/img/clients/upkar-dev.webp', logo_w: 358, logo_h: 176 },
    { name: 'Namaste Exports Ltd', logo_key: 'assets/img/clients/namaste-exports.webp', logo_w: 289, logo_h: 93 },
    { name: 'Sasken Technologies', logo_key: 'assets/img/clients/sasken.webp', logo_w: 268, logo_h: 134 },
    { name: 'SPT Residential', logo_key: 'assets/img/clients/spt.webp', logo_w: 217, logo_h: 237 },
    { name: 'Prince Piping Systems Ltd', logo_key: 'assets/img/clients/prince-pipes.webp', logo_w: 334, logo_h: 69 },
    { name: 'Prakash Tea Agency', logo_key: 'assets/img/clients/prakash-tea.webp', logo_w: 379, logo_h: 203 },
    { name: 'Raja Housing and Raja Capital', logo_key: 'assets/img/clients/raja.webp', logo_w: 379, logo_h: 292 },
    { name: 'Peel Plywood', logo_key: 'assets/img/clients/peel.webp', logo_w: 306, logo_h: 194 },
    { name: 'New India Electricals', logo_key: 'assets/img/clients/new-india.webp', logo_w: 339, logo_h: 68 },
    { name: 'TmaxSoft', logo_key: 'assets/img/clients/tmax.webp', logo_w: 348, logo_h: 73 },
    { name: 'Bid and Hammer', logo_key: 'assets/img/clients/bid-and-hammer.webp', logo_w: 379, logo_h: 119 },
    { name: 'Blooms and Greens', logo_key: 'assets/img/clients/blooms.webp', logo_w: 378, logo_h: 117 },
    { name: 'Hegde Precision Products', logo_key: 'assets/img/clients/hegde.webp', logo_w: 276, logo_h: 134 }
  ];

  // Parse clients.html text index
  const clientsHtml = fs.readFileSync('clients.html', 'utf-8');
  const indexMatches = Array.from(clientsHtml.matchAll(/<li data-client>(.*?)<\/li>/g));

  const textClients = indexMatches.map(m => {
    let raw = m[1];
    let location = null;
    const noteMatch = raw.match(/<span class="note">(.*?)<\/span>/);
    if (noteMatch) {
      location = noteMatch[1].replace(/&amp;/g, '&').trim();
      raw = raw.replace(/<span class="note">.*?<\/span>/, '');
    }
    const name = raw.replace(/&amp;/g, '&').trim();
    return { name, location };
  });

  console.log(`Found ${textClients.length} clients in text index, ${featuredLogos.length} featured logos.`);

  // Combine list
  const clientMap = new Map();

  // First insert featured logos
  featuredLogos.forEach((c, idx) => {
    clientMap.set(c.name.toLowerCase(), {
      name: c.name,
      location: null,
      logo_key: c.logo_key,
      logo_w: c.logo_w,
      logo_h: c.logo_h,
      show_home_strip: true,
      show_logo_grid: true,
      show_name_list: false,
      sort_order: idx + 1
    });
  });

  // Then merge text clients
  let sortOrder = featuredLogos.length + 1;
  textClients.forEach(tc => {
    const key = tc.name.toLowerCase();
    if (clientMap.has(key)) {
      const existing = clientMap.get(key);
      if (tc.location) existing.location = tc.location;
      existing.show_name_list = true;
    } else {
      clientMap.set(key, {
        name: tc.name,
        location: tc.location,
        logo_key: null,
        logo_w: null,
        logo_h: null,
        show_home_strip: false,
        show_logo_grid: false,
        show_name_list: true,
        sort_order: sortOrder++
      });
    }
  });

  // Clear existing before seed
  await pool.query('DELETE FROM clients');

  let inserted = 0;
  for (const client of clientMap.values()) {
    await pool.query(
      `INSERT INTO clients (name, location, logo_key, logo_w, logo_h, show_home_strip, show_logo_grid, show_name_list, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published')`,
      [
        client.name,
        client.location,
        client.logo_key,
        client.logo_w,
        client.logo_h,
        client.show_home_strip,
        client.show_logo_grid,
        client.show_name_list,
        client.sort_order
      ]
    );
    inserted++;
  }

  console.log(`Successfully seeded ${inserted} clients into Neon database.`);
  await pool.end();
}

seed().catch(console.error);
