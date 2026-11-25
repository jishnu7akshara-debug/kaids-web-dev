import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function renderOgWithSharp() {
  const width = 1200;
  const height = 630;

  // Partner portraits: width 180, height 225 (4:5)
  const pWidth = 180;
  const pHeight = 225;

  const [p1, p2, p3, seal] = await Promise.all([
    sharp(path.join(rootDir, 'assets/img/partners/partner-1-800.jpg')).resize(pWidth, pHeight).toBuffer(),
    sharp(path.join(rootDir, 'assets/img/partners/partner-2-800.jpg')).resize(pWidth, pHeight).toBuffer(),
    sharp(path.join(rootDir, 'assets/img/partners/partner-3-800.jpg')).resize(pWidth, pHeight).toBuffer(),
    sharp(path.join(rootDir, 'assets/img/kaids-seal.png')).resize(48, 48).toBuffer(),
  ]);

  // Positions for portraits:
  // Total width available on right side: 1200 - 580 = 620px
  // 3 * 180 = 540px. Remaining space: 80px -> gap = 25px
  const startX = 575;
  const gap = 25;
  const topY = 160;

  const x1 = startX;
  const x2 = startX + pWidth + gap;
  const x3 = startX + (pWidth + gap) * 2;

  // SVG text overlay
  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .tag { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 600; fill: #94a3b8; letter-spacing: 2px; text-transform: uppercase; }
      .brand-title { font-family: system-ui, -apple-system, sans-serif; font-size: 18px; font-weight: 700; fill: #ffffff; letter-spacing: 1px; }
      .title { font-family: system-ui, -apple-system, sans-serif; font-size: 54px; font-weight: 700; fill: #ffffff; letter-spacing: -1px; }
      .subhead { font-family: system-ui, -apple-system, sans-serif; font-size: 21px; font-weight: 400; fill: #cbd5e1; }
      .meta { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; fill: #64748b; }
      .name { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 600; fill: #f8fafc; }
      .role { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 400; fill: #94a3b8; }
      .card-bg { fill: #111726; stroke: rgba(255, 255, 255, 0.12); stroke-width: 1; }
    </style>

    <!-- Left Brand Header -->
    <text x="135" y="88" class="brand-title">KAIDS</text>
    <text x="135" y="105" class="tag">Karnataka Industrial Documentation Services</text>

    <!-- Green Accent Bar -->
    <rect x="70" y="210" width="44" height="4" fill="#0e9f6e" rx="2" />

    <!-- Title & Subtitle -->
    <text x="70" y="275" class="title">Partners</text>
    <text x="70" y="325" class="subhead">Three partners. One family firm.</text>
    <text x="70" y="355" class="subhead">Every client file has a partner on it.</text>

    <!-- Footer meta -->
    <text x="70" y="540" class="meta">kaids.in/partners  •  Bengaluru, Karnataka</text>

    <!-- Card Backgrounds & Captions -->
    <!-- Card 1 -->
    <rect x="${x1}" y="${topY}" width="${pWidth}" height="${pHeight + 48}" rx="3" class="card-bg" />
    <text x="${x1 + 12}" y="${topY + pHeight + 29}" class="name">Gurunath D Vernekar</text>

    <!-- Card 2 -->
    <rect x="${x2}" y="${topY}" width="${pWidth}" height="${pHeight + 48}" rx="3" class="card-bg" />
    <text x="${x2 + 12}" y="${topY + pHeight + 29}" class="name">Tejas G Vernekar</text>

    <!-- Card 3 -->
    <rect x="${x3}" y="${topY}" width="${pWidth}" height="${pHeight + 48}" rx="3" class="card-bg" />
    <text x="${x3 + 12}" y="${topY + pHeight + 29}" class="name">Ajay G Vernekar</text>
  </svg>
  `;

  const outputPath = path.join(rootDir, 'assets/img/partners-og.jpg');

  // Create solid dark navy canvas #151c2e
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 21, g: 28, b: 46 }
    }
  })
    .composite([
      // Seal
      { input: seal, top: 68, left: 70 },
      // SVG text elements and card backgrounds
      { input: Buffer.from(svgOverlay), top: 0, left: 0 },
      // Portraits
      { input: p1, top: topY, left: x1 },
      { input: p2, top: topY, left: x2 },
      { input: p3, top: topY, left: x3 },
    ])
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  console.log(`Generated OG social card at ${outputPath}`);
}

renderOgWithSharp().catch(err => {
  console.error(err);
  process.exit(1);
});
