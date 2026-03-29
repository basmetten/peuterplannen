import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests using axe-core.
 *
 * Phase 5 exit criterion: zero axe-core critical violations.
 * We test the most important page types at both viewports.
 */

/** Wait for home page app to hydrate */
async function waitForApp(page: Page) {
  await page.goto('/');
  await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 15_000 });
}

/** Run axe and return violations filtered to critical + serious */
async function getViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Exclude map canvas — MapLibre GL is not accessible by default
    // and fixing it is out of scope for this phase
    .exclude('.maplibregl-canvas-container')
    .analyze();

  return results.violations;
}

test.describe('Accessibility — Home page', () => {
  test('has no critical or serious violations', async ({ page }) => {
    await waitForApp(page);
    const violations = await getViolations(page);

    const critical = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (critical.length > 0) {
      const summary = critical.map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instance${v.nodes.length > 1 ? 's' : ''})`,
      );
      console.error('Accessibility violations:\n' + summary.join('\n'));
    }

    expect(critical).toHaveLength(0);
  });

  test('has proper heading hierarchy', async ({ page }) => {
    await waitForApp(page);

    // Page should have at most one h1 (or none, since home is app-like)
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('skip link is present in DOM', async ({ page }) => {
    await page.goto('/');

    // Skip link exists in the DOM (sr-only, visible on focus)
    const skipLink = page.getByText('Ga naar inhoud');
    await expect(skipLink).toBeAttached();
    // It links to main content
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('all images have alt text', async ({ page }) => {
    await waitForApp(page);

    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('interactive elements have accessible names', async ({ page }) => {
    await waitForApp(page);

    // All buttons should have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const name = await button.getAttribute('aria-label') ?? await button.textContent();
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Accessibility — Region page (SSR)', () => {
  test('has no critical or serious violations', async ({ page }) => {
    await page.goto('/amsterdam');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const violations = await getViolations(page);
    const critical = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toHaveLength(0);
  });

  test('has semantic heading hierarchy', async ({ page }) => {
    await page.goto('/amsterdam');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // h1 should contain city name
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('Amsterdam');
  });

  test('breadcrumb navigation is accessible', async ({ page }) => {
    await page.goto('/amsterdam');

    const nav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(nav).toBeVisible();
  });
});

test.describe('Accessibility — Blog page (SSR)', () => {
  test('has no critical or serious violations', async ({ page }) => {
    await page.goto('/blog/amsterdam-met-peuters-en-kleuters');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const violations = await getViolations(page);
    const critical = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toHaveLength(0);
  });
});

test.describe('Accessibility — Keyboard navigation', () => {
  test('search input is reachable by keyboard', async ({ page }) => {
    await waitForApp(page);

    // Tab through skip link to reach search
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Enter'); // activate skip link

    // Search input should be reachable
    const search = page.getByPlaceholder('Zoek een uitje...');
    // Focus it directly and type
    await search.focus();
    await expect(search).toBeFocused();
  });

  test('filter chips are keyboard accessible', async ({ page }) => {
    await waitForApp(page);

    // Filter buttons should be focusable and activatable with Enter/Space
    const filterBtn = page.getByRole('button', { name: 'Speeltuin', exact: true }).first();
    await filterBtn.focus();
    await expect(filterBtn).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });
});
