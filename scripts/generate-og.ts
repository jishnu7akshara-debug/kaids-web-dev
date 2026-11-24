import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function generateOg() {
  const sealBase64 = fs.readFileSync('assets/img/kaids-seal.png').toString('base64');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #151c2e;
      color: #f7f9fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 72px 80px;
      position: relative;
      overflow: hidden;
    }
    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: #d97706;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .seal {
      width: 72px;
      height: 72px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(247, 249, 250, 0.85);
    }
    .middle {
      margin: auto 0;
    }
    .slogan {
      font-size: 64px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #ffffff;
      max-width: 900px;
    }
    .slogan span {
      color: #fbbf24;
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-top: 1px solid rgba(247, 249, 250, 0.15);
      padding-top: 28px;
    }
    .details {
      font-size: 18px;
      color: rgba(247, 249, 250, 0.65);
    }
    .domain {
      font-size: 22px;
      font-weight: 600;
      color: #fbbf24;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="top">
    <img class="seal" src="data:image/png;base64,${sealBase64}" alt="KAIDS Seal">
    <div class="brand-name">Karnataka Industrial Documentation Services</div>
  </div>
  <div class="middle">
    <h1 class="slogan">From land allotment to the final NOC,<br><span>we carry the file.</span></h1>
  </div>
  <div class="bottom">
    <div class="details">Industrial documentation, statutory compliance and project execution · Bengaluru</div>
    <div class="domain">kaids.in</div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 }
  });

  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: 'assets/img/og.jpg',
    type: 'jpeg',
    quality: 92
  });

  await browser.close();
  console.log('Successfully generated assets/img/og.jpg (1200x630)');
}

generateOg().catch(console.error);
