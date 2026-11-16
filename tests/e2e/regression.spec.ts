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
    await page.goto('/index.html#services');
    const servicesSection = page.locator('#services');
    await expect(servicesSection).toBeVisible();

    const activeGroup = page.locator('.svc-group.is-active');
    await expect(activeGroup).toBeVisible();
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
