import { test, expect } from '@playwright/test';

test.describe('Phase 4: Legal & Privacy DPDP Verification', () => {
  test('Public pages set zero cookies and initiate zero third-party requests', async ({ page }) => {
    const thirdPartyRequests: string[] = [];

    page.on('request', req => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        thirdPartyRequests.push(url.href);
      }
    });

    await page.goto('/index.html');
    const cookies = await page.context().cookies();

    // Verify zero cookies on public website
    expect(cookies).toHaveLength(0);
    // Verify zero third-party tracking calls
    expect(thirdPartyRequests).toHaveLength(0);
  });

  test('Footer displays Legal section linking to Privacy Notice, Terms, and Cookie disclosure', async ({ page }) => {
    await page.goto('/index.html');

    const privacyLink = page.locator('footer a[href="privacy.html"]');
    const termsLink = page.locator('footer a[href="terms.html"]');
    const cookiesLink = page.locator('footer a[href="cookies.html"]');

    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
    await expect(cookiesLink).toBeVisible();
  });

  test('Privacy page loads with DPDP compliance headings and Data Fiduciary details', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page.locator('h1')).toHaveText('Privacy notice');
    await expect(page.locator('main').locator('text=Karnataka Industrial Documentation Services').first()).toBeVisible();
    await expect(page.locator('text=grievance@kaids.in')).toBeVisible();
  });

  test('Cookie disclosure page documents __Host-kaids_session and zero public cookies', async ({ page }) => {
    await page.goto('/cookies.html');
    await expect(page.locator('h1')).toHaveText('Cookie disclosure');
    await expect(page.locator('text=__Host-kaids_session')).toBeVisible();
    await expect(page.locator('text=Public Website: Zero Cookies')).toBeVisible();
  });

  test('Terms of use page displays standard regulatory and legal disclaimers', async ({ page }) => {
    await page.goto('/terms.html');
    await expect(page.locator('h1')).toHaveText('Terms of use');
    await expect(page.locator('text=Informational Purposes & No Legal Advice')).toBeVisible();
  });
});

