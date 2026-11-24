import { test, expect } from '@playwright/test';

test.describe('KAIDS Public Site Regression Baseline', () => {
  test('Home page loads with no console errors and no horizontal overflow', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/index.html');
    await expect(page).toHaveTitle(/KAIDS/);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Hero section loads and displays key messaging', async ({ page }) => {
    await page.goto('/index.html');
    const heroH1 = page.locator('.hero h1');
    await expect(heroH1).toBeVisible();
    await expect(heroH1).toContainText('From land allotment');
  });

  test('Services section displays groups and photo interaction', async ({ page }) => {
    await page.goto('/index.html');
    
    // Verify first shot (land) is active initially
    const landShot = page.locator('.svc-stack img[data-shot="land"]');
    await expect(landShot).toHaveClass(/is-active/);

    // Scroll into services section
    const servicesSection = page.locator('#services');
    await servicesSection.scrollIntoViewIfNeeded();
    await expect(servicesSection).toBeVisible();

    if (page.viewportSize()?.width && page.viewportSize()!.width >= 992) {
      const panel = page.locator('.svc-panel');
      await expect(panel).toHaveCSS('position', 'sticky');
    }

    // Scroll down to Approvals and clearances group
    const approvalsGroup = page.locator('.svc-group[data-group="approvals"]');
    await approvalsGroup.scrollIntoViewIfNeeded();

    // Verify photo switches to approvals and approvals group becomes active
    const approvalsShot = page.locator('.svc-stack img[data-shot="approvals"]');
    await expect(approvalsShot).toHaveClass(/is-active/);
    await expect(approvalsGroup).toHaveClass(/is-active/);

    // Test filter chip interaction
    const constructionChip = page.locator('.svc-filter button[data-filter="construction"]');
    await constructionChip.click();
    const constructionShot = page.locator('.svc-stack img[data-shot="construction"]');
    await expect(constructionShot).toHaveClass(/is-active/);
  });

  test('Form client-side validation displays expected field messages', async ({ page }) => {
    await page.goto('/index.html#contact');
    const form = page.locator('[data-enquiry]');
    await expect(form).toBeVisible();

    // Trigger submit on empty required fields
    const submitBtn = form.locator('button[type="submit"]');
    await submitBtn.click();

    // Check name error
    const nameError = form.locator('#f-name-error');
    await expect(nameError).toHaveText('Enter your name.');
  });

  test('Form submission to /api/enquiries completes successfully and displays success message', async ({ page }) => {
    await page.goto('/contact.html');
    const form = page.locator('[data-enquiry]');
    await expect(form).toBeVisible();

    // Focus to set startedAt timing
    await page.focus('#f-name');
    await page.fill('#f-name', 'Ramesh Vernekar');
    // Wait for the 3-second anti-bot timing check
    await page.waitForTimeout(3200);

    await page.fill('#f-phone', '9845012345');
    await page.fill('#f-email', 'ramesh@example.com');
    await page.fill('#f-company', 'Vernekar Industries');
    await page.selectOption('#f-service', 'Building Plan Sanction and Approvals');
    await page.fill('#f-message', 'Need help with KIADB land allotment in Harohalli.');
    await page.check('#f-consent');

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/enquiries')),
      form.locator('button[type="submit"]').click()
    ]);

    expect([200, 201]).toContain(response.status());
    const statusMsg = form.locator('[data-form-status]');
    await expect(statusMsg).toBeVisible();
    await expect(statusMsg).toContainText('Enquiry sent');
  });

  test('Clients page search filters client items', async ({ page }) => {
    await page.goto('/clients.html');
    const searchInput = page.locator('#client-search');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Harohalli');
    const countElement = page.locator('[data-client-count]');
    await expect(countElement).toContainText('match "Harohalli"');
  });

  test('Dedicated pages (about, services, process, contact) load correctly with zero errors', async ({ page }) => {
    const pages = [
      { url: '/about.html', titleText: 'Industrial documentation, liaison' },
      { url: '/services.html', titleText: 'Thirteen services' },
      { url: '/process.html', titleText: 'How a file moves' },
      { url: '/contact.html', titleText: 'Tell us about your plot' }
    ];

    for (const p of pages) {
      const consoleErrors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

      await page.goto(p.url);
      const heading = page.locator('h1');
      await expect(heading).toContainText(p.titleText);
      expect(consoleErrors).toHaveLength(0);

      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);
    }
  });

  test('404 page exists and renders correctly', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('h1')).toHaveText('Page not found.');
  });
});
