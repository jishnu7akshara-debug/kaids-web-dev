import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const viewports = [
  { name: '320', width: 320, height: 568, isMobile: true, screenshot: true },
  { name: '360', width: 360, height: 740, isMobile: true, screenshot: false },
  { name: '375', width: 375, height: 667, isMobile: true, screenshot: false },
  { name: '390', width: 390, height: 844, isMobile: true, screenshot: true },
  { name: '430', width: 430, height: 932, isMobile: true, screenshot: false },
  { name: '494', width: 494, height: 844, isMobile: true, screenshot: true },
  { name: '844x390', width: 844, height: 390, isMobile: true, screenshot: false },
  { name: '768', width: 768, height: 1024, isMobile: true, screenshot: false },
  { name: '834', width: 834, height: 1194, isMobile: true, screenshot: true },
  { name: '1024x768', width: 1024, height: 768, isMobile: false, screenshot: true },
  { name: '1280', width: 1280, height: 800, isMobile: false, screenshot: false },
  { name: '1366', width: 1366, height: 768, isMobile: false, screenshot: false },
  { name: '1440', width: 1440, height: 900, isMobile: false, screenshot: true },
  { name: '1920', width: 1920, height: 1080, isMobile: false, screenshot: false }
];

const shotDir = path.join(process.cwd(), 'docs', 'screenshots', 'contact');
fs.mkdirSync(shotDir, { recursive: true });

test.describe('Contact Page & Home Contact Section Responsive Alignment', () => {
  for (const vp of viewports) {
    test(`Contact layout, margins, tap targets, and inputs at ${vp.name}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.isMobile
      });
      const page = await ctx.newPage();

      for (const url of ['/contact.html', '/index.html#contact']) {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(350);

        const check = await page.evaluate(() => {
          const overflow = document.documentElement.scrollWidth - window.innerWidth;
          const bodyText = document.body.innerText.replace(/\s+/g, '');
          const hasForbiddenNumber = bodyText.includes('9620253180');

          // Tel links >= 44px tall
          const smallTel = Array.from(document.querySelectorAll('a[href^="tel:"]'))
            .filter(a => (a as HTMLElement).offsetParent !== null)
            .map(a => ({ text: a.textContent?.trim(), h: Math.round(a.getBoundingClientRect().height) }))
            .filter(x => x.h < 44);

          // Form controls >= 16px
          const smallInputs = Array.from(document.querySelectorAll('.form input:not([type="checkbox"]), .form select, .form textarea'))
            .map(el => ({ id: el.id, fs: parseFloat(getComputedStyle(el).fontSize) }))
            .filter(x => x.fs < 16);

          // Desk cards edge alignment
          let headEdges = null;
          let cardEdges: Array<{ left: number; right: number }> = [];
          const deskGrid = document.querySelector('.desk-grid');
          if (deskGrid) {
            const head = deskGrid.previousElementSibling;
            if (head) {
              const hr = head.getBoundingClientRect();
              headEdges = { left: Math.round(hr.left), right: Math.round(hr.right) };
            }
            cardEdges = Array.from(deskGrid.querySelectorAll('.desk-card')).map(c => {
              const r = c.getBoundingClientRect();
              return { left: Math.round(r.left), right: Math.round(r.right) };
            });
          }

          return { overflow, hasForbiddenNumber, smallTel, smallInputs, headEdges, cardEdges };
        });

        expect(check.overflow, `Horizontal overflow on ${url} at ${vp.name}`).toBe(0);
        expect(check.hasForbiddenNumber, `Forbidden number on ${url}`).toBe(false);
        expect(check.smallTel, `Small tel links on ${url} at ${vp.name}`).toEqual([]);
        expect(check.smallInputs, `Small form inputs on ${url} at ${vp.name}`).toEqual([]);

        if (check.headEdges && check.cardEdges.length > 0 && vp.width < 640) {
          for (const ce of check.cardEdges) {
            expect(Math.abs(ce.left - check.headEdges.left)).toBeLessThanOrEqual(1);
            expect(Math.abs(ce.right - check.headEdges.right)).toBeLessThanOrEqual(1);
          }
        }

        if (url === '/contact.html' && vp.screenshot) {
          await page.screenshot({ path: path.join(shotDir, `${vp.name}.png`), fullPage: true });
        }
      }

      await ctx.close();
    });
  }
});
