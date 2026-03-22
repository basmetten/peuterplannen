import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const disableAnimationsCSS = readFileSync(
  join(__dirname, 'disable-animations.css'),
  'utf-8'
);

test.beforeEach(async ({ page }) => {
  // Inject animation-killer CSS
  await page.addStyleTag({ content: disableAnimationsCSS });
});

test.describe('App loads correctly', () => {
  test('homepage renders map and sheet', async ({ page }) => {
    await page.goto('/app.html');

    // Map loads
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Search pill visible
    await expect(page.locator('#sheet-search-pill')).toBeVisible();

    // Sheet tabs visible
    await expect(page.getByRole('button', { name: 'Ontdek' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bewaard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan' })).toBeVisible();
  });

  test('peek state screenshot', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
    // Wait for map tiles
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('peek-state.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('Sheet navigation', () => {
  test('Ontdek tab loads location list', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Ontdek' }).click();

    // Sheet should expand to half state
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');

    // Compact cards should appear
    await expect(page.locator('.compact-card').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('ontdek-half.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('Bewaard tab switches active state', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Bewaard' }).click();

    // Bewaard tab should be active
    const bewaard = page.getByRole('button', { name: 'Bewaard' });
    await expect(bewaard).toHaveClass(/active/);
  });

  test('gear icon opens info panel', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Instellingen' }).click();

    // Info panel should be visible
    await expect(page.getByText('Over PeuterPlannen')).toBeVisible();
  });
});

test.describe('Filter chips', () => {
  test('preset chips are visible in peek', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Regenproof' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buiten+Koffie' })).toBeVisible();
  });

  test('type filter chips work', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Open half state
    await page.getByRole('button', { name: 'Ontdek' }).click();
    await expect(page.locator('.compact-card').first()).toBeVisible({ timeout: 10000 });

    // Click Museum filter
    await page.getByRole('button', { name: 'Museum' }).click();

    // Wait for reload
    await page.waitForTimeout(1000);

    // Museum chip should be active
    const museumChip = page.locator('.sheet-filter-chip[data-filter="museum"]');
    await expect(museumChip).toHaveClass(/active/);
  });

  test('Meer filter modal opens', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Ontdek' }).click();
    await expect(page.locator('.compact-card').first()).toBeVisible({ timeout: 10000 });

    // Open filter modal
    await page.locator('#sheet-filter-more-btn').click();

    // Modal should be visible
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);
    await expect(page.getByText('Meer filters')).toBeVisible();
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
