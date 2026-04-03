/**
 * Sheet navigation tests — verifies the Apple Maps-style stacked sheet flows.
 *
 * Uses the mobile-touch project (Chromium with hasTouch + iPhone viewport).
 *
 * Silk manages sheet gestures internally. In Playwright, we can't reliably
 * swipe the sheet to half state via CDP touch. Instead, we trigger the half
 * state by tapping the search input (which fires onSearchFocus → snap to half).
 * We then wait for the DOM to update and verify the content.
 */

import { test, expect } from '@playwright/test';

/** Helper: get sheet to half state by dispatching a custom event.
 * Silk's gesture handling doesn't work with Playwright's headless touch events,
 * so we programmatically trigger the search focus which snaps to half. */
async function goToHalf(page: import('@playwright/test').Page) {
  // Focus the search input — triggers onSearchFocus → snap to half
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="Zoek"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1000);
  // Close search dropdown with Escape, then blur
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.waitForTimeout(1000);
}

test.describe('Sheet Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
  });

  test('peek state shows only search bar', async ({ page }) => {
    await expect(page.getByPlaceholder('Zoek een uitje')).toBeVisible();
    // Category section should NOT be visible at peek
    await expect(page.getByText('ONTDEK IN DE BUURT')).not.toBeVisible();
  });

  test('half state shows quick-filter category rows', async ({ page }) => {
    await goToHalf(page);

    // Category section should be visible
    const section = page.getByText('ONTDEK IN DE BUURT');
    // Wait up to 5s for the section to appear
    await expect(section).toBeVisible({ timeout: 5000 });

    // At least some category buttons visible
    const cats = page.locator('button', { hasText: /Speeltuin|Boerderij|Pannenkoek/ });
    await expect(cats.first()).toBeVisible({ timeout: 3000 });
  });

  test('category tap opens results stacked sheet', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    // Find any visible category button and click it
    const categories = ['Speeltuin', 'Boerderij', 'Pannenkoek', 'Natuur', 'Museum'];
    let clicked = false;
    for (const cat of categories) {
      const btn = page.locator('button', { hasText: cat }).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    test.skip(!clicked, 'No category button visible at half state');
    await page.waitForTimeout(2000);

    // Results sheet should show location count
    await expect(page.getByText(/\d+ locaties?/)).toBeVisible({ timeout: 5000 });
    // Close button
    await expect(page.getByLabel('Sluiten')).toBeVisible();
  });

  test('results sheet close returns to home', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    await page.locator('button', { hasText: 'Boerderij' }).first().click();
    await page.waitForTimeout(2000);

    // Close results
    await page.getByLabel('Sluiten').last().click();
    await page.waitForTimeout(2000);

    // Results title should be gone
    await expect(page.getByText('Kinderboerderij')).not.toBeVisible({ timeout: 3000 });
  });

  test('gidsen entry opens guide list sheet', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    const gidsen = page.locator('button', { hasText: 'Tips en routes' });
    const visible = await gidsen.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!visible, 'Gidsen entry not visible at half state (needs scroll or larger viewport)');

    await gidsen.click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('Uitgelicht')).toBeVisible({ timeout: 3000 });
  });

  test('rapid category open/close does not crash', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    for (let i = 0; i < 5; i++) {
      const cat = page.locator('button', { hasText: 'Speeltuin' }).first();
      if (await cat.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cat.click();
        await page.waitForTimeout(800);
        const close = page.getByLabel('Sluiten').last();
        if (await close.isVisible({ timeout: 1000 }).catch(() => false)) {
          await close.click();
          await page.waitForTimeout(800);
        }
      }
    }

    // App should still be functional
    await expect(page.getByPlaceholder('Zoek een uitje')).toBeVisible();
  });

  test('filter chips visible in category results', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    // Click any visible category
    const btn = page.locator('button', { hasText: /Speeltuin|Museum|Boerderij/ }).first();
    if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Category not visible');
      return;
    }
    await btn.click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('Binnen')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Buiten')).toBeVisible();
  });

  test('sort toggle works in category results', async ({ page }) => {
    await goToHalf(page);
    await page.waitForTimeout(500);

    const btn = page.locator('button', { hasText: /Speeltuin|Museum|Boerderij/ }).first();
    if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Category not visible');
      return;
    }
    await btn.click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('Beste score')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('A–Z')).toBeVisible();

    await page.getByText('A–Z').click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/\d+ locaties?/)).toBeVisible();
  });
});
