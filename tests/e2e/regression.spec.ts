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

  test('Clients page search filters client items', async ({ page }) => {
    await page.goto('/clients.html');
    const searchInput = page.locator('#client-search');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Harohalli');
    const countElement = page.locator('[data-client-count]');
    await expect(countElement).toContainText('match "Harohalli"');
  });

  test('404 page exists and renders correctly', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('h1')).toHaveText('Page not found.');
  });
});
