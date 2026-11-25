import { test, expect } from '@playwright/test';

test.describe('Partners Section & Bio Pop-up Dialogs', () => {
  test('Home page displays Partners section with 3 cards', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('#partners');
    await expect(section).toBeVisible();

    const cards = section.locator('.partner-card');
    await expect(cards).toHaveCount(3);

    // Verify first partner card content
    const firstCard = cards.first();
    await expect(firstCard.locator('.partner-name')).toContainText('Gurunath D');
    await expect(firstCard.locator('.partner-role')).toContainText('Founder and managing partner');
    await expect(firstCard.locator('.partner-line')).toContainText("Has worked with Bengaluru's land and industrial authorities since 2000.");

    // Check images
    const img = firstCard.locator('img');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('alt', /Portrait of Gurunath D Vernekar/);
  });

  test('Clicking Read bio opens the native modal dialog and ESC closes it', async ({ page }) => {
    await page.goto('/');

    const readBioBtn = page.locator('.partner-card [data-partner-open="partner-1"]');
    await readBioBtn.click();

    const dialog = page.locator('#dialog-partner-1');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('open', '');

    // Focus trapped or moved inside dialog
    const closeBtn = dialog.locator('.dialog-close');
    await expect(closeBtn).toBeVisible();

    // Verify dialog content
    await expect(dialog.locator('#dialog-title-partner-1')).toHaveText('Gurunath D Vernekar');
    await expect(dialog.locator('.dialog-bio')).toContainText('Gurunath founded Verna Developers in 2000');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Focus restored to opener button
    await expect(readBioBtn).toBeFocused();
  });

  test('Dialog close button closes dialog and restores focus', async ({ page }) => {
    await page.goto('/');

    const readBioBtn = page.locator('.partner-card [data-partner-open="partner-2"]');
    await readBioBtn.click();

    const dialog = page.locator('#dialog-partner-2');
    await expect(dialog).toBeVisible();

    const closeBtn = dialog.locator('.dialog-close');
    await closeBtn.click();

    await expect(dialog).not.toBeVisible();
    await expect(readBioBtn).toBeFocused();
  });

  test('Clicking dialog backdrop closes dialog on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mobile modal is full-screen 100vh with no exposed backdrop');

    await page.goto('/');

    const readBioBtn = page.locator('.partner-card [data-partner-open="partner-1"]');
    await readBioBtn.click();

    const dialog = page.locator('#dialog-partner-1');
    await expect(dialog).toBeVisible();

    // Click outside panel (on dialog backdrop at top corner of fixed dialog overlay)
    await dialog.click({ position: { x: 10, y: 10 } });
    await expect(dialog).not.toBeVisible();
  });

  test('Prev/Next navigation cycles between partners inside dialog', async ({ page }) => {
    await page.goto('/');

    // Open partner-1
    await page.locator('.partner-card [data-partner-open="partner-1"]').click();
    const dialog1 = page.locator('#dialog-partner-1');
    await expect(dialog1).toBeVisible();

    // Click "Next partner" -> opens partner-2
    await dialog1.locator('[data-partner-next="partner-2"]').click();
    const dialog2 = page.locator('#dialog-partner-2');
    await expect(dialog2).toBeVisible();
    await expect(dialog1).not.toBeVisible();
    await expect(dialog2.locator('#dialog-title-partner-2')).toHaveText('Tejas G Vernekar');

    // Click "Next partner" -> opens partner-3
    await dialog2.locator('[data-partner-next="partner-3"]').click();
    const dialog3 = page.locator('#dialog-partner-3');
    await expect(dialog3).toBeVisible();
    await expect(dialog2).not.toBeVisible();
    await expect(dialog3.locator('#dialog-title-partner-3')).toHaveText('Ajay G Vernekar');

    // Click "Previous partner" -> back to partner-2
    await dialog3.locator('[data-partner-prev="partner-2"]').click();
    await expect(dialog2).toBeVisible();
    await expect(dialog3).not.toBeVisible();
  });

  test('Hash deep-linking opens matching dialog on page load', async ({ page }) => {
    await page.goto('/#partner-partner-2');

    const dialog = page.locator('#dialog-partner-2');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#dialog-title-partner-2')).toHaveText('Tejas G Vernekar');
  });

  test('Nav and footer contain Partners link on all primary pages', async ({ page, isMobile }) => {
    // Check Home page nav and footer
    await page.goto('/');

    if (isMobile) {
      // Open drawer on mobile
      await page.locator('[data-menu-toggle]').click();
    }
    const homeNavPartner = page.locator('#nav a[href="#partners"]');
    await expect(homeNavPartner).toBeVisible();

    const homeFooterPartner = page.locator('.site-footer a[href="partners.html"]');
    await expect(homeFooterPartner).toBeVisible();

    // Check About page nav and footer
    await page.goto('/about.html');
    if (isMobile) {
      await page.locator('[data-menu-toggle]').click();
    }
    const aboutNavPartner = page.locator('#nav a[href="partners.html"]');
    await expect(aboutNavPartner).toBeVisible();

    const aboutFooterPartner = page.locator('.site-footer a[href="partners.html"]');
    await expect(aboutFooterPartner).toBeVisible();
  });
});

test.describe('Dedicated /partners Page', () => {
  test('Renders 3 full partner profiles and in-page navigation', async ({ page }) => {
    await page.goto('/partners.html');

    // Nav item exists and has aria-current="page"
    const navLink = page.locator('#nav a[href="partners.html"]');
    await expect(navLink).toHaveAttribute('aria-current', 'page');

    // Check in-page jump nav
    const inpageNav = page.locator('.partner-inpage-nav');
    await expect(inpageNav).toBeVisible();
    await expect(inpageNav.locator('a[href="#partner-1"]')).toContainText('Gurunath');
    await expect(inpageNav.locator('a[href="#partner-2"]')).toContainText('Tejas');
    await expect(inpageNav.locator('a[href="#partner-3"]')).toContainText('Ajay');

    // Check 3 partner profile articles
    const profiles = page.locator('.partner-profile');
    await expect(profiles).toHaveCount(3);

    // Profile 1
    const p1 = page.locator('#partner-1');
    await expect(p1.locator('h2')).toHaveText('Gurunath D Vernekar');
    await expect(p1.locator('.partner-role')).toHaveText('Founder and managing partner');
    await expect(p1.locator('.profile-bio')).toContainText('Gurunath founded Verna Developers in 2000');
    await expect(p1.locator('.focus-list li')).toHaveCount(3);

    // Profile 2
    const p2 = page.locator('#partner-2');
    await expect(p2.locator('h2')).toHaveText('Tejas G Vernekar');
    await expect(p2.locator('.partner-role')).toHaveText('Co-founder, legal and compliance');

    // Profile 3
    const p3 = page.locator('#partner-3');
    await expect(p3.locator('h2')).toHaveText('Ajay G Vernekar');
    await expect(p3.locator('.partner-role')).toHaveText('Partner, finance and growth');

    // Check JSON-LD schema
    const schemaScript = page.locator('script[type="application/ld+json"]');
    const jsonText = await schemaScript.textContent();
    expect(jsonText).toBeTruthy();
    const parsed = JSON.parse(jsonText!);
    expect(parsed['@graph']).toHaveLength(3);
  });
});
