import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression tests — screenshot baselines.
 *
 * Captures key states at both mobile and desktop viewports.
 * First run creates baselines in e2e/__screenshots__/.
 * Subsequent runs compare against baselines.
 *
 * Run `npx playwright test e2e/visual-regression.spec.ts --update-snapshots`
 * to regenerate baselines after intentional visual changes.
 */

/** Wait for the home page to fully load */
async function waitForApp(page: Page) {
  await page.goto('/');
  await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 15_000 });
  // Let any animations settle
  await page.waitForTimeout(500);
}

test.describe('Visual regression — Home', () => {
  test('home page initial state', async ({ page }) => {
    await waitForApp(page);
    await expect(page).toHaveScreenshot('home-initial.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('home page with search active', async ({ page }) => {
    await waitForApp(page);
    await page.getByPlaceholder('Zoek een uitje...').fill('Amsterdam');
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('home-search-active.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('home page with filter active', async ({ page }) => {
    await waitForApp(page);
    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('home-filter-active.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — Detail', () => {
  test('detail view open', async ({ page }) => {
    await waitForApp(page);

    const card = page.getByTestId('location-card').first();
    await card.click({ timeout: 5_000 });
    await expect(page.getByText('Faciliteiten')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('detail-open.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — SSR pages', () => {
  test('region hub page', async ({ page }) => {
    await page.goto('/amsterdam');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('region-amsterdam.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('blog post page', async ({ page }) => {
    await page.goto('/blog/amsterdam-met-peuters-en-kleuters');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('blog-post.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — Empty states', () => {
  test('no search results', async ({ page }) => {
    await waitForApp(page);
    await page.getByPlaceholder('Zoek een uitje...').fill('zzzznoresultsxyz');
    await expect(page.getByText(/Geen (resultaat|locaties)/)).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('empty-search-results.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — 404', () => {
  test('not found page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('404-page.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
