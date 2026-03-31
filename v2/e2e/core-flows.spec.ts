import { test, expect, type Page } from '@playwright/test';

/** Wait for the home page app to hydrate — search bar is visible at peek */
async function waitForApp(page: Page) {
  await page.goto('/');
  await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 15_000 });
}

/** Expand sheet to full so location cards and count are visible */
async function expandSheet(page: Page) {
  // Click the search bar to expand sheet from peek to at least half
  await page.getByPlaceholder('Zoek een uitje...').click();
  // Wait for location count to become visible (sheet expanded past peek)
  await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 10_000 });
}

/** Click a location card to open detail view */
async function openFirstDetail(page: Page) {
  const card = page.getByTestId('location-card').first();
  await card.click({ timeout: 5_000 });
  // Wait for detail to load — close button appears
  await expect(page.getByLabel('Sluiten')).toBeVisible({ timeout: 5_000 });
}

test.describe('Home page loads', () => {
  test('renders location cards', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await expect(page.getByTestId('location-card').first()).toBeVisible({ timeout: 5_000 });
  });

  test('has search input', async ({ page }) => {
    await waitForApp(page);
  });

  test('has category grid', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    // Category grid buttons use short labels
    await expect(page.getByRole('button', { name: 'Speeltuin', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Boerderij', exact: true }).first()).toBeVisible();
  });
});

test.describe('Search', () => {
  test('filters results by query', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    await page.getByPlaceholder('Zoek een uitje...').fill('Artis');
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('clears search restores all results', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    const search = page.getByPlaceholder('Zoek een uitje...');
    await search.fill('Artis');
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });

    await search.clear();
    await expect(page.getByText(/^\d+ locaties$/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Filters', () => {
  test('type filter reduces results', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    // Use exact match to avoid hitting card type badges
    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('filter persists in URL', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });

    // Type enum value is 'play' for Speeltuin
    expect(page.url()).toContain('types=');
  });

  test('weather filter works', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    await page.getByRole('button', { name: 'Binnen', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('empty state shows when no results', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);

    await page.getByPlaceholder('Zoek een uitje...').fill('zzzznoresultsxyz');
    await expect(page.getByText(/Geen (resultaat|locaties)/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Location detail', () => {
  test('opens detail from card click', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await openFirstDetail(page);
  });

  test('detail has action buttons', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await openFirstDetail(page);

    // Action buttons — use exact match to avoid location highlight text containing "route"
    const routeBtn = page.getByRole('link', { name: 'Route' });
    await routeBtn.scrollIntoViewIfNeeded();
    await expect(routeBtn).toBeVisible({ timeout: 5_000 });
  });

  test('close button returns to list', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await openFirstDetail(page);

    // Force click — Silk sheet overlay can intercept pointer events during animation
    await page.getByLabel('Sluiten').first().click({ force: true });
    // After closing, search bar should be visible again
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Favorites', () => {
  test('can save favorite from detail', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await openFirstDetail(page);

    // Save as favorite — force click to bypass Silk overlay interception
    await page.getByLabel('Bewaar als favoriet').first().click({ force: true });

    // Close detail
    await page.getByLabel('Sluiten').first().click({ force: true });
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 5_000 });

    // Bewaard section should now be visible in home content (sheet expanded)
    await expandSheet(page);
    await expect(page.getByText(/Bewaard \(\d+\)/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Plan', () => {
  test('can add to plan from detail', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    await openFirstDetail(page);

    // Add to plan
    await page.getByLabel('Toevoegen aan plan').first().click();
    // Verify the button changed to "Verwijder uit plan" (exact text avoids matching location names)
    await expect(page.getByLabel('Verwijder uit plan')).toBeVisible({ timeout: 2_000 });

    // Close detail
    await page.getByLabel('Sluiten').first().click();
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 5_000 });

    // Plan section should now be visible in home content (sheet expanded)
    await expandSheet(page);
    await expect(page.getByText(/Je plan \(\d+\)/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('SSR content pages', () => {
  test('region hub loads with content', async ({ page }) => {
    await page.goto('/amsterdam');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Amsterdam');
    await expect(page.getByText(/\d+ locaties/)).toBeVisible();
  });

  test('blog post loads with content', async ({ page }) => {
    await page.goto('/blog/amsterdam-met-peuters-en-kleuters');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('min lezen')).toBeVisible();
  });

  test('blog index lists posts', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const articles = page.locator('a[href^="/blog/"]');
    await expect(articles.first()).toBeVisible();
    expect(await articles.count()).toBeGreaterThan(5);
  });

  test('guides overview loads', async ({ page }) => {
    await page.goto('/guides');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('404 shows for invalid routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Navigation', () => {
  test('footer links exist on content pages', async ({ page }) => {
    await page.goto('/amsterdam');

    const privacyLink = page.getByRole('link', { name: 'Privacy' });
    await privacyLink.scrollIntoViewIfNeeded();
    await expect(privacyLink).toBeVisible({ timeout: 5_000 });
  });

  test('breadcrumb navigation works', async ({ page }) => {
    await page.goto('/amsterdam');

    const homeLink = page.getByRole('link', { name: 'Home' });
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('No critical errors', () => {
  test('home page loads without app crashes', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore WebGL warnings (expected in CI/headless) and resource loading
        if (text.includes('WebGL') || text.includes('Failed to load resource') || text.includes('webglcontextcreationerror')) return;
        criticalErrors.push(text);
      }
    });

    await waitForApp(page);

    // No error boundary should be visible
    await expect(page.getByText('Er ging iets mis')).not.toBeVisible();
    expect(criticalErrors).toHaveLength(0);
  });
});
