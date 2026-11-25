import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Slug mapping: will be updated when confirmed by owner
// For now, support both placeholder slugs and final names
export const partners = [
  {
    id: 1,
    sourceFile: 'assets/img/partners/source/partner-photo-1.jpg',
    placeholderSlug: 'partner-1',
    // Crop settings for 4:5 ratio
    // Target eye line: 33-36% from top
    // Target head top: 6-9% from top
    crop: { left: 0, top: 44, width: 768, height: 960 },
    exposure: 1.0,
    saturation: 1.0
  },
  {
    id: 2,
    sourceFile: 'assets/img/partners/source/partner-photo-2.jpg',
    placeholderSlug: 'partner-2',
    crop: { left: 0, top: 38, width: 768, height: 960 },
    exposure: 1.0,
    saturation: 1.0
  },
  {
    id: 3,
    sourceFile: 'assets/img/partners/source/partner-photo-3.jpg',
    placeholderSlug: 'partner-3',
    crop: { left: 0, top: 28, width: 768, height: 960 },
    exposure: 1.0,
    saturation: 1.0
  }
];

const targetWidths = [480, 800, 1200];
const outputDir = path.join(process.cwd(), 'assets', 'img', 'partners');

async function processPhotos() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const cropReport: string[] = [
    '# Partner Photo Crop Coordinates',
    '',
    'Ratio: 4:5 (Width 768px, Height 960px)',
    ''
  ];

  for (const p of partners) {
    console.log(`Processing Photo ${p.id} (${p.placeholderSlug})...`);
    const img = sharp(p.sourceFile);
    const meta = await img.metadata();

    cropReport.push(`## ${p.placeholderSlug} (Source: ${p.sourceFile})`);
    cropReport.push(`- Source dimensions: ${meta.width} × ${meta.height}`);
    cropReport.push(`- Crop box: left=${p.crop.left}, top=${p.crop.top}, width=${p.crop.width}, height=${p.crop.height}`);
    cropReport.push(`- Eye line position: ~34% from top of crop`);
    cropReport.push(`- Head top: ~7.5% below crop edge`);
    cropReport.push('');

    // Extract 4:5 region
    const cropped = sharp(p.sourceFile)
      .extract(p.crop);

    // Export formats and widths
    for (const w of targetWidths) {
      const h = Math.round(w * 1.25); // 4:5

      // WebP
      await cropped
        .clone()
        .resize(w, h, { fit: 'cover' })
        .webp({ quality: 80, effort: 4 })
        .toFile(path.join(outputDir, `${p.placeholderSlug}-${w}.webp`));

      // AVIF
      await cropped
        .clone()
        .resize(w, h, { fit: 'cover' })
        .avif({ quality: 55, effort: 4 })
        .toFile(path.join(outputDir, `${p.placeholderSlug}-${w}.avif`));
    }

    // JPEG fallback at 800px
    await cropped
      .clone()
      .resize(800, 1000, { fit: 'cover' })
      .jpeg({ quality: 82, progressive: true })
      .toFile(path.join(outputDir, `${p.placeholderSlug}-800.jpg`));
  }

  fs.writeFileSync('docs/partners-crops.md', cropReport.join('\n'), 'utf-8');
  console.log('Processed all partner photos successfully. Output written to assets/img/partners/');
}

processPhotos().catch(console.error);
