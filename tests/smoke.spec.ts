import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { clickSheetTab } from './helpers';

const disableAnimationsCSS = readFileSync(
  join(__dirname, 'disable-animations.css'),
  'utf-8'
);

test.beforeEach(async ({ page }) => {
  // Pre-set cookie consent so the banner never appears
  await page.addInitScript(() => {
    localStorage.setItem('pp_consent', JSON.stringify({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    }));
  });
  // Inject animation-killer CSS
  await page.addStyleTag({ content: disableAnimationsCSS });
});

test.describe('App loads correctly', () => {
  test('homepage renders map and sheet', async ({ page, isMobile }) => {
    await page.goto('/app.html');

    // Map loads
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    if (isMobile) {
      // Search pill visible
      await expect(page.locator('#sheet-search-pill')).toBeVisible();

      // Category filter chips visible in half state
      await expect(page.locator('.sheet-filter-chip[data-filter="all"]')).toBeVisible();
      // Filter button visible next to search bar
      await expect(page.locator('#sheet-filter-btn')).toBeVisible();
    } else {
      // Desktop sidebar visible
      await expect(page.locator('#list-view')).toBeVisible();
    }
  });

  test('initial state screenshot', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
    // Wait for map tiles
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('initial-state.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('Sheet navigation', () => {
  test('Ontdek tab loads location list', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await clickSheetTab(page, 'ontdek');

    // Sheet should expand to half state
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');

    // Scan cards should appear
    await expect(page.locator('.sheet-scan-card').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('ontdek-half.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('Filter button opens filter modal', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await page.locator('#sheet-filter-btn').click();

    // Filter modal should open
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);
  });

  test('info panel accessible via desktop sidebar', async ({ page, isMobile }) => {
    if (isMobile) test.skip(); // Info tab removed from mobile sheet per PRD

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Desktop has info access through the nav
    await expect(page.locator('#list-view')).toBeVisible();
  });
});

test.describe('Filter chips', () => {
  test('preset chips are visible in half state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('#sheet-presets button[data-preset="rain"]')).toBeVisible();
    await expect(page.locator('#sheet-presets button[data-preset="outdoor-coffee"]')).toBeVisible();
  });

  test('type filter chips work', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Open half state
    await clickSheetTab(page, 'ontdek');
    await expect(page.locator('.sheet-scan-card').first()).toBeVisible({ timeout: 10000 });

    // Click Museum filter chip
    await page.locator('.sheet-filter-chip[data-filter="museum"]').click();

    // Wait for reload
    await page.waitForTimeout(1000);

    // Museum chip should be active
    const museumChip = page.locator('.sheet-filter-chip[data-filter="museum"]');
    await expect(museumChip).toHaveClass(/active/);
  });

  test('Filter modal opens with correct structure', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Open filter modal via filter button
    await page.locator('#sheet-filter-btn').click();

    // Modal should be visible
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Binnen' })).toBeVisible();

    await expect(page).toHaveScreenshot('filter-modal.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('Scan cards (desktop)', () => {
  test('scan cards render with 5 elements', async ({ page, isMobile }) => {
    if (isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Wait for cards to load
    await expect(page.locator('.scan-card').first()).toBeVisible({ timeout: 15000 });

    const firstCard = page.locator('.scan-card').first();

    // Photo
    await expect(firstCard.locator('.scan-photo img')).toBeVisible();
    // Type badge
    await expect(firstCard.locator('.scan-type-badge')).toBeVisible();
    // Fav button
    await expect(firstCard.locator('.scan-fav')).toBeVisible();
    // Name
    await expect(firstCard.locator('.scan-name')).toBeVisible();
    // One-liner
    await expect(firstCard.locator('.scan-oneliner')).toBeVisible();
  });

  test('desktop sidebar with cards screenshot', async ({ page, isMobile }) => {
    if (isMobile) test.skip();

    await page.goto('/app.html');

    // Wait for cards
    await expect(page.locator('.scan-card').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('desktop-with-cards.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
