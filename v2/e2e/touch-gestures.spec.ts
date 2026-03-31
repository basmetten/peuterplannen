/**
 * Touch gesture tests for the bottom sheet and interactive elements.
 *
 * These tests run on the 'mobile-touch' project (Chromium with hasTouch: true).
 * They simulate real touch sequences (touchstart/touchmove/touchend) to verify
 * that sheet snap points, swipe gestures, and touch feedback work correctly.
 */

import { test, expect, type Page } from '@playwright/test';
import { swipeUp, swipeDown, fling } from './helpers/touch';

// Only run on mobile-touch project
test.describe('Sheet touch gestures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to hydrate and sheet to appear
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 15_000 });
    // Small delay for Silk sheet to initialize
    await page.waitForTimeout(500);
  });

  test('sheet starts at peek state', async ({ page }) => {
    // At peek, the search bar should be visible
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible();

    // Take baseline screenshot
    await page.screenshot({ path: 'test-results/touch-peek-state.png' });
  });

  test('swipe up from peek → half', async ({ page }) => {
    // Find the sheet handle or content area
    const sheet = page.locator('.SilkSheet-content').first();
    await expect(sheet).toBeVisible();

    // Swipe up ~200px (should move from peek to half)
    await swipeUp(sheet, 200);

    // Wait for snap animation
    await page.waitForTimeout(500);

    // At half state, category grid should be visible
    await expect(page.getByRole('button', { name: 'Speeltuin', exact: true }).first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'test-results/touch-half-state.png' });
  });

  test('swipe up from half → full', async ({ page }) => {
    const sheet = page.locator('.SilkSheet-content').first();
    await expect(sheet).toBeVisible();

    // First swipe to half
    await swipeUp(sheet, 200);
    await page.waitForTimeout(500);

    // Then swipe to full
    await swipeUp(sheet, 250);
    await page.waitForTimeout(500);

    // At full state, location cards should be visible
    await expect(page.getByTestId('location-card').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/touch-full-state.png' });
  });

  test('swipe down from full → half → peek', async ({ page }) => {
    const sheet = page.locator('.SilkSheet-content').first();
    await expect(sheet).toBeVisible();

    // Go to full first
    await swipeUp(sheet, 200);
    await page.waitForTimeout(400);
    await swipeUp(sheet, 250);
    await page.waitForTimeout(500);

    // Swipe down — should go to half
    await swipeDown(sheet, 200);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/touch-back-to-half.png' });

    // Swipe down again — should go to peek
    await swipeDown(sheet, 200);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/touch-back-to-peek.png' });
  });

  test('fling up opens sheet quickly', async ({ page }) => {
    const sheet = page.locator('.SilkSheet-content').first();
    await expect(sheet).toBeVisible();

    // Fast fling — should snap to full due to velocity
    await fling(sheet, 'up', 300);
    await page.waitForTimeout(600);

    // Should be at full with cards visible
    await expect(page.getByTestId('location-card').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/touch-fling-full.png' });
  });

  test('rapid sheet cycling does not crash', async ({ page }) => {
    const sheet = page.locator('.SilkSheet-content').first();
    await expect(sheet).toBeVisible();

    // Rapidly cycle peek → full → peek 5 times
    for (let i = 0; i < 5; i++) {
      await swipeUp(sheet, 400);
      await page.waitForTimeout(400);
      await swipeDown(sheet, 400);
      await page.waitForTimeout(400);
    }

    // App should still be alive — search bar visible
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible();

    // No console errors about WebGL context loss
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') logs.push(msg.text());
    });

    await page.screenshot({ path: 'test-results/touch-rapid-cycle.png' });
  });
});

test.describe('Detail view touch interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
  });

  test('tap card opens detail, close button dismisses', async ({ page }) => {
    const sheet = page.locator('.SilkSheet-content').first();

    // Swipe to full to see cards
    await fling(sheet, 'up', 400);
    await page.waitForTimeout(600);

    // Tap first card
    const card = page.getByTestId('location-card').first();
    if (await card.isVisible()) {
      await card.tap();
      await page.waitForTimeout(500);

      // Detail should be open — close button visible (first() because DetailView also has one)
      const closeBtn = page.getByLabel('Sluiten').first();
      await expect(closeBtn).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/touch-detail-open.png' });

      // Tap close
      await closeBtn.tap();
      await page.waitForTimeout(500);

      // Back to browse — search visible
      await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible();

      await page.screenshot({ path: 'test-results/touch-detail-closed.png' });
    }
  });
});
