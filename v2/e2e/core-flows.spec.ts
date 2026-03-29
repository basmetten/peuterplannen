import { test, expect, type Page } from '@playwright/test';

/** Wait for the home page app to fully hydrate and show locations */
async function waitForApp(page: Page) {
  await page.goto('/');
  await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 15_000 });
}

/** Click a location card to open detail view */
async function openFirstDetail(page: Page) {
  const card = page.getByTestId('location-card').first();
  await card.click({ timeout: 5_000 });
  await expect(page.getByText('Faciliteiten')).toBeVisible({ timeout: 5_000 });
}

test.describe('Home page loads', () => {
  test('renders location cards', async ({ page }) => {
    await waitForApp(page);
  });

  test('has search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 15_000 });
  });

  test('has category grid', async ({ page }) => {
    await waitForApp(page);
    // Category grid buttons use short labels
    await expect(page.getByRole('button', { name: 'Speeltuin', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Boerderij', exact: true }).first()).toBeVisible();
  });
});

test.describe('Search', () => {
  test('filters results by query', async ({ page }) => {
    await waitForApp(page);

    await page.getByPlaceholder('Zoek een uitje...').fill('Artis');
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('clears search restores all results', async ({ page }) => {
    await waitForApp(page);

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

    // Use exact match to avoid hitting card type badges
    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('filter persists in URL', async ({ page }) => {
    await waitForApp(page);

    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });

    // Type enum value is 'play' for Speeltuin
    expect(page.url()).toContain('types=');
  });

  test('weather filter works', async ({ page }) => {
    await waitForApp(page);

    await page.getByRole('button', { name: 'Binnen', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });

  test('empty state shows when no results', async ({ page }) => {
    await waitForApp(page);

    await page.getByPlaceholder('Zoek een uitje...').fill('zzzznoresultsxyz');
    await expect(page.getByText(/Geen (resultaat|locaties)/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Location detail', () => {
  test('opens detail from card click', async ({ page }) => {
    await waitForApp(page);
    await openFirstDetail(page);
  });

  test('detail has action buttons', async ({ page }) => {
    await waitForApp(page);
    await openFirstDetail(page);

    // Action buttons may be below fold — scroll to them
    const routeBtn = page.getByText('Route');
    await routeBtn.scrollIntoViewIfNeeded();
    await expect(routeBtn).toBeVisible({ timeout: 5_000 });
  });

  test('back button returns to list', async ({ page }) => {
    await waitForApp(page);
    await openFirstDetail(page);

    await page.getByLabel('Terug').click();
    await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Favorites', () => {
  test('can save and view favorites', async ({ page }) => {
    await waitForApp(page);
    await openFirstDetail(page);

    // Save as favorite
    await page.getByLabel('Bewaar als favoriet').click();
    await expect(page.getByText('Bewaard').first()).toBeVisible({ timeout: 2_000 });

    // Go back
    await page.getByLabel('Terug').click();
    await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 5_000 });

    // Navigate to Bewaard mode (pill inside sheet/sidebar — badge may append count to name)
    await page.getByRole('button', { name: /^Bewaard/ }).first().click();

    // Should show at least 1 favorited location
    await expect(page.getByText('1 locatie')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Plan', () => {
  test('can add to plan from detail', async ({ page }) => {
    await waitForApp(page);
    await openFirstDetail(page);

    // Add to plan
    await page.getByLabel('Toevoegen aan plan').click();
    await expect(page.getByText('In plan')).toBeVisible({ timeout: 2_000 });

    // Go back
    await page.getByLabel('Terug').click();
    await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 5_000 });

    // Navigate to Plan mode (pill inside sheet/sidebar — badge may append count to name)
    await page.getByRole('button', { name: /^Plan/ }).first().click();

    await expect(page.getByText('Dagplanner')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('1 locatie')).toBeVisible();
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
    await expect(page.getByText('Oeps, dat ging niet goed')).not.toBeVisible();
    expect(criticalErrors).toHaveLength(0);
  });
});
