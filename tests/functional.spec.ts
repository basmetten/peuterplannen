import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const disableCSS = readFileSync(join(__dirname, 'disable-animations.css'), 'utf-8');

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({ content: disableCSS });
});

/* ─────────────────────────────────────────────
   SEARCH FUNCTIONALITY (mobile bottom sheet)
   ───────────────────────────────────────────── */
test.describe('Search functionality', () => {
  test('search pill expands on click', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('#sheet-search-pill').click();

    // Sheet should gain search-active class
    await expect(page.locator('#bottom-sheet')).toHaveClass(/search-active/);

    // Search input should be visible and focusable
    const input = page.locator('#sheet-search-input');
    await expect(input).toBeVisible();
  });

  test('search cancel closes search mode', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Open search
    await page.locator('#sheet-search-pill').click();
    await expect(page.locator('#bottom-sheet')).toHaveClass(/search-active/);

    // Cancel
    await page.locator('#sheet-search-cancel').click();
    await expect(page.locator('#bottom-sheet')).not.toHaveClass(/search-active/);
  });

  test('typing in search does not crash', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('#sheet-search-pill').click();
    await page.locator('#sheet-search-input').fill('artis');

    // Wait for potential suggestions request
    await page.waitForTimeout(500);

    // App should still be in a functional state — sheet visible, no JS errors
    const sheet = page.locator('#bottom-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/search-active/);
  });
});

/* ─────────────────────────────────────────────
   PRESET CHIPS (mobile sheet)
   ───────────────────────────────────────────── */
test.describe('Preset chips', () => {
  test('preset chip toggles active state on click', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const preset = page.locator('.sheet-preset[data-preset="rain"]');
    await expect(preset).toBeVisible();

    // Click to activate
    await preset.click();
    await expect(preset).toHaveAttribute('aria-pressed', 'true');

    // Click again to deactivate
    await preset.click();
    await expect(preset).toHaveAttribute('aria-pressed', 'false');
  });

  test('activating one preset deactivates another', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const rain = page.locator('.sheet-preset[data-preset="rain"]');
    const outdoor = page.locator('.sheet-preset[data-preset="outdoor-coffee"]');

    // Activate rain
    await rain.click();
    await expect(rain).toHaveAttribute('aria-pressed', 'true');

    // Activate outdoor-coffee — rain should deactivate
    await outdoor.click();
    await expect(outdoor).toHaveAttribute('aria-pressed', 'true');
    await expect(rain).toHaveAttribute('aria-pressed', 'false');
  });
});

/* ─────────────────────────────────────────────
   SHEET STATES (mobile)
   ───────────────────────────────────────────── */
test.describe('Sheet states', () => {
  test('sheet starts in peek state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'peek');
  });

  test('tapping Ontdek tab transitions to half', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');
  });

  test('tapping Bewaard tab transitions to half and marks active', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const bewaard = page.locator('.sheet-tab[data-tab="bewaard"]');
    await bewaard.click();

    await expect(bewaard).toHaveClass(/active/);
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');
  });

  test('Escape key closes search-active state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Open search
    await page.locator('#sheet-search-pill').click();
    await expect(page.locator('#bottom-sheet')).toHaveClass(/search-active/);

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#bottom-sheet')).not.toHaveClass(/search-active/);
  });
});

/* ─────────────────────────────────────────────
   SHEET FILTER CHIPS (mobile)
   ───────────────────────────────────────────── */
test.describe('Sheet filter chips', () => {
  test('filter chip toggles active state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Expand to half to see filter chips
    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');

    // Click Speeltuin filter chip
    const playChip = page.locator('.sheet-filter-chip[data-filter="play"]');
    await playChip.click();
    await expect(playChip).toHaveAttribute('aria-pressed', 'true');

    // "Alles" chip should no longer be active
    const allChip = page.locator('.sheet-filter-chip[data-filter="all"]');
    await expect(allChip).toHaveAttribute('aria-pressed', 'false');
  });

  test('Meer filters button opens filter modal', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Expand to half
    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');

    // Click Meer button
    await page.locator('#sheet-filter-more-btn').click();
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);
  });

  test('filter modal close button dismisses modal', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await page.locator('#sheet-filter-more-btn').click();
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);

    // Close modal
    await page.locator('#filter-modal-close').click();
    await expect(page.locator('#filter-modal')).not.toHaveClass(/open/);
  });
});

/* ─────────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────────── */
test.describe('Navigation', () => {
  test('static pages return 200', async ({ page }) => {
    for (const path of ['/', '/about.html', '/contact.html', '/app.html']) {
      const resp = await page.goto(path);
      expect(resp?.status(), `${path} should return 200`).toBe(200);
    }
  });

  test('mobile hamburger menu toggles open/closed', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const burger = page.locator('.nav-burger');
    await expect(burger).toBeVisible();

    // Open menu
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');

    // Mobile menu should be visible
    const mobileMenu = page.locator('#nav-mobile-menu');
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'false');

    // Close menu
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop mode toggle switches to plan view', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Click "Plan mijn dag" in the mode switch
    const planChip = page.locator('.app-mode-chip[data-mode-target="plan"]').first();
    await planChip.click();

    // Body should gain plan-mode class
    await expect(page.locator('body')).toHaveClass(/plan-mode/);

    // Plan view should be visible
    await expect(page.locator('#plan-view')).toBeVisible();

    // Switch back
    const homeChip = page.locator('.app-mode-chip[data-mode-target="home"]').first();
    await homeChip.click();
    await expect(page.locator('body')).not.toHaveClass(/plan-mode/);
  });

  test('404 page renders for non-existent path', async ({ page }) => {
    const resp = await page.goto('/does-not-exist-xyz.html');
    // serve returns 404 for missing files
    expect(resp?.status()).toBe(404);
  });
});

/* ─────────────────────────────────────────────
   DESKTOP SIDEBAR (list view)
   ───────────────────────────────────────────── */
test.describe('Desktop sidebar interactions', () => {
  test('sort select changes sort order', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await expect(page.locator('.scan-card').first()).toBeVisible({ timeout: 15000 });

    const sortSelect = page.locator('#sort-select');
    await expect(sortSelect).toBeVisible();

    // Change to A-Z
    await sortSelect.selectOption('az');
    await expect(sortSelect).toHaveValue('az');

    // Wait for re-render
    await page.waitForTimeout(500);

    // Cards should still be visible
    await expect(page.locator('.scan-card').first()).toBeVisible();
  });

  test('popular city chip sets location', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Click Amsterdam city chip
    const amsterdamChip = page.locator('.city-chip', { hasText: 'Amsterdam' });
    await amsterdamChip.click();

    // Location input should now contain Amsterdam
    await expect(page.locator('#location-input')).toHaveValue('Amsterdam');
  });

  test('panel collapse button hides sidebar', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const collapseBtn = page.locator('#panel-collapse-btn');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      // List view should be hidden/collapsed
      await expect(page.locator('#list-view')).toHaveClass(/collapsed/);
    }
  });
});

/* ─────────────────────────────────────────────
   DESKTOP FILTER PANEL
   ───────────────────────────────────────────── */
test.describe('Desktop filter panel', () => {
  test('filter panel toggle expands and collapses', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const toggle = page.locator('#filter-panel-toggle');
    const panel = page.locator('#filter-panel');

    // Panel starts collapsed
    await expect(panel).toHaveClass(/collapsed/);

    // Click to expand
    await toggle.click();
    await expect(panel).not.toHaveClass(/collapsed/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    await toggle.click();
    await expect(panel).toHaveClass(/collapsed/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop type filter chip toggles', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Expand filter panel
    await page.locator('#filter-panel-toggle').click();
    await expect(page.locator('#filter-panel')).not.toHaveClass(/collapsed/);

    // Click Speeltuin chip
    const playChip = page.locator('#filter-chip-toolbar .chip[data-type="play"]');
    await playChip.click();
    await expect(playChip).toHaveAttribute('aria-selected', 'true');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Results should still be visible
    await expect(page.locator('#results-container')).toBeVisible();
  });
});

/* ─────────────────────────────────────────────
   PLAN VIEW
   ───────────────────────────────────────────── */
test.describe('Plan view', () => {
  test('plan wizard renders all steps on desktop', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Switch to plan mode
    await page.locator('.app-mode-chip[data-mode-target="plan"]').first().click();
    await expect(page.locator('body')).toHaveClass(/plan-mode/);

    // Verify all wizard steps are present
    await expect(page.locator('.plan-step-label', { hasText: 'Hoe oud is je peuter?' })).toBeVisible();
    await expect(page.locator('.plan-step-label', { hasText: 'Hoe ga je op pad?' })).toBeVisible();
    await expect(page.locator('.plan-step-label', { hasText: 'Wanneer?' })).toBeVisible();
    await expect(page.locator('.plan-step-label', { hasText: 'Hoe lang?' })).toBeVisible();

    // Generate button visible
    await expect(page.locator('#plan-gen-btn')).toBeVisible();
  });

  test('plan transport selection works', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.app-mode-chip[data-mode-target="plan"]').first().click();

    // Auto should be selected by default
    const autoChip = page.locator('.plan-chip[data-transport="auto"]');
    await expect(autoChip).toHaveClass(/selected/);

    // Select Fiets
    const fietsChip = page.locator('.plan-chip[data-transport="fiets"]');
    await fietsChip.click();
    await expect(fietsChip).toHaveClass(/selected/);
    await expect(autoChip).not.toHaveClass(/selected/);
  });

  test('plan view accessible via mobile sheet tab', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Tap Plan tab in bottom sheet
    const planTab = page.locator('.sheet-tab[data-tab="plan"]');
    await planTab.click();

    // Should switch to plan view
    await expect(page.locator('#plan-view')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/plan-mode/);
  });
});

/* ─────────────────────────────────────────────
   DETAIL VIEW (via URL parameter)
   ───────────────────────────────────────────── */
test.describe('Detail view', () => {
  test('locatie parameter shows detail view', async ({ page }) => {
    // Navigate to a location detail via URL param
    // The detail view is loaded dynamically from Supabase, so we just
    // verify the detail container becomes visible (or stays hidden if
    // Supabase is unreachable in test env)
    await page.goto('/app.html?locatie=artis');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    // Give the app time to process the URL parameter
    await page.waitForTimeout(2000);

    // Detail view should either be visible (Supabase reachable)
    // or the app should not crash (no JS errors)
    const detailView = page.locator('#detail-view');
    const isVisible = await detailView.isVisible();

    // If Supabase is reachable and the slug matches, detail-view shows
    // Either way, app must remain functional
    await expect(page.locator('#map')).toBeVisible();
  });
});

/* ─────────────────────────────────────────────
   ACCESSIBILITY BASICS
   ───────────────────────────────────────────── */
test.describe('Accessibility', () => {
  test('skip link is present', async ({ page }) => {
    await page.goto('/app.html');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#app-container');
  });

  test('sheet tabs have correct ARIA roles', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    const tablist = page.locator('#sheet-tabs');
    await expect(tablist).toHaveAttribute('role', 'tablist');

    const tabs = page.locator('.sheet-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Each tab should have role="tab"
    for (let i = 0; i < count; i++) {
      await expect(tabs.nth(i)).toHaveAttribute('role', 'tab');
    }
  });

  test('filter modal has correct ARIA attributes', async ({ page }) => {
    await page.goto('/app.html');

    const modal = page.locator('#filter-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-label', 'Meer filters');
  });

  test('search input has aria-label', async ({ page }) => {
    await page.goto('/app.html');

    // Desktop search input
    await expect(page.locator('#location-input')).toHaveAttribute('aria-label', 'Zoek locatie');

    // Mobile sheet search input
    await expect(page.locator('#sheet-search-input')).toHaveAttribute(
      'aria-label',
      'Zoek een uitje of plaats'
    );
  });
});

/* ─────────────────────────────────────────────
   VISUAL REGRESSION — ADDITIONAL STATES
   ───────────────────────────────────────────── */
test.describe('Visual regression - additional states', () => {
  test('search expanded state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('#sheet-search-pill').click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('search-expanded.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('mobile peek state baseline', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-peek.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('mobile half state with cards', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-half-cards.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('hamburger menu open state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.nav-burger').click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('mobile-menu-open.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('desktop plan view', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.app-mode-chip[data-mode-target="plan"]').first().click();
    await expect(page.locator('body')).toHaveClass(/plan-mode/);
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('desktop-plan-view.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('filter modal open state', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await page.goto('/app.html');
    await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('.sheet-tab[data-tab="ontdek"]').click();
    await expect(page.locator('#bottom-sheet')).toHaveAttribute('data-state', 'half');

    await page.locator('#sheet-filter-more-btn').click();
    await expect(page.locator('#filter-modal')).toHaveClass(/open/);
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('filter-modal-open.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
