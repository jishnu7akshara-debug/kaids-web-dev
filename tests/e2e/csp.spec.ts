import { test, expect } from '@playwright/test';

const CSP_PUBLIC = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";

const pagesToTest = [
  '/',
  '/about.html',
  '/services.html',
  '/process.html',
  '/clients.html',
  '/partners.html',
  '/contact.html',
  '/privacy.html',
  '/terms.html',
  '/cookies.html',
  '/404.html',
  '/admin/login.html'
];

test.describe('Strict CSP (style-src self) Zero-Violation Verification', () => {
  test('All public and admin login pages trigger zero CSP violations and zero CSP console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.route('**/*', async route => {
      const response = await route.fetch();
      const headers = { ...response.headers(), 'content-security-policy': CSP_PUBLIC };
      await route.fulfill({ response, headers });
    });

    await page.addInitScript(() => {
      (window as any).__cspViolations = [];
      document.addEventListener('securitypolicyviolation', e => {
        (window as any).__cspViolations.push({
          directive: e.violatedDirective,
          sample: e.sample,
          source: e.sourceFile,
          line: e.lineNumber
        });
      });
    });

    for (const url of pagesToTest) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);

      if (url === '/') {
        // Test interactive states on home page
        await page.locator('.svc-filter button[data-filter="construction"]').click();
        await page.locator('.partner-card [data-partner-open="partner-1"]').click();
        await page.keyboard.press('Escape');
        await page.locator('#contact button[type="submit"]').click();
      }

      const violations = await page.evaluate(() => (window as any).__cspViolations);
      expect(violations, `CSP violations on ${url}`).toEqual([]);
    }

    expect(consoleErrors).toEqual([]);
  });
});
