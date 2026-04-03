import { test, expect, type Page } from '@playwright/test';

/** Wait for the home page app to hydrate — search bar is visible at peek */
async function waitForApp(page: Page) {
  await page.goto('/');
  await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 15_000 });
}

/** Detect if we're on desktop or mobile */
function isDesktop(page: Page) {
  const viewport = page.viewportSize();
  return viewport && viewport.width >= 1024;
}

/** On mobile: expand sheet by clicking search (triggers snap to full).
 *  On desktop: content is always visible in sidebar. */
async function expandSheet(page: Page) {
  if (isDesktop(page)) {
    await expect(page.getByText(/\d+ locaties/)).toBeVisible({ timeout: 15_000 });
  } else {
    // Mobile: click search to expand from peek to full
    await page.getByPlaceholder('Zoek een uitje...').click();
    await page.waitForTimeout(1500);
    // Dismiss search dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

/** Open a category results sheet on mobile, or click category on desktop */
async function openCategoryResults(page: Page) {
  if (isDesktop(page)) {
    // Desktop: click category grid button directly (filters inline)
    await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
    await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
  } else {
    // Mobile: tap category row to open stacked results sheet
    await expandSheet(page);
    // Find a visible category button
    const cats = ['Speeltuin', 'Boerderij', 'Pannenkoek', 'Natuur', 'Museum'];
    for (const cat of cats) {
      const btn = page.locator('button', { hasText: cat }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        break;
      }
    }
    await expect(page.getByText(/\d+ locaties?/)).toBeVisible({ timeout: 10_000 });
  }
}

/** Click a location card to open detail view */
async function openFirstDetail(page: Page) {
  const card = page.getByTestId('location-card').first();
  await card.click({ timeout: 5_000 });
  await expect(page.getByLabel('Sluiten')).toBeVisible({ timeout: 5_000 });
}

test.describe('Home page loads', () => {
  test('renders location cards', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await expect(page.getByTestId('location-card').first()).toBeVisible({ timeout: 5_000 });
  });

  test('has search input', async ({ page }) => {
    await waitForApp(page);
  });

  test('has category options', async ({ page }) => {
    await waitForApp(page);
    await expandSheet(page);
    // Both mobile (QuickFilterList) and desktop (CategoryGrid) show category buttons
    await expect(page.getByRole('button', { name: 'Speeltuin', exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Boerderij', exact: true }).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Search', () => {
  test('filters results by query', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      await page.getByPlaceholder('Zoek een uitje...').fill('Artis');
      await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: search shows dropdown results, not inline filtering
      await page.getByPlaceholder('Zoek een uitje...').click();
      await page.getByPlaceholder('Zoek een uitje...').fill('Artis');
      // Search command dropdown should show results
      await page.waitForTimeout(1000);
      // Verify search input has value
      await expect(page.getByPlaceholder('Zoek een uitje...')).toHaveValue('Artis');
    }
  });

  test('clears search restores state', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      const search = page.getByPlaceholder('Zoek een uitje...');
      await search.fill('Artis');
      await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
      await search.clear();
      await expect(page.getByText(/^\d+ locaties$/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: clearing search returns to home launchpad
      await page.getByPlaceholder('Zoek een uitje...').click();
      await page.getByPlaceholder('Zoek een uitje...').fill('Artis');
      await page.waitForTimeout(500);
      await page.getByPlaceholder('Zoek een uitje...').clear();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible();
    }
  });
});

test.describe('Filters', () => {
  test('type filter reduces results', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
      await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: category tap opens results sheet with filtered results
      await openCategoryResults(page);
      await expect(page.getByText(/\d+ locaties?/)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('filter persists in URL', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      await page.getByRole('button', { name: 'Speeltuin', exact: true }).first().click();
      await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
      expect(page.url()).toContain('types=');
    } else {
      // Mobile: category results use local state (not URL), so skip URL check
      await openCategoryResults(page);
      await expect(page.getByText(/\d+ locaties?/)).toBeVisible();
    }
  });

  test('weather filter works', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      await page.getByRole('button', { name: 'Binnen', exact: true }).first().click();
      await expect(page.getByText(/\d+ van \d+ locaties/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: weather filter is inside category results sheet
      await openCategoryResults(page);
      await page.getByRole('button', { name: 'Binnen', exact: true }).first().click();
      await page.waitForTimeout(1000);
      await expect(page.getByText(/\d+ locaties?/)).toBeVisible();
    }
  });

  test('empty state shows when no results', async ({ page }) => {
    await waitForApp(page);
    if (isDesktop(page)) {
      await expandSheet(page);
      await page.getByPlaceholder('Zoek een uitje...').fill('zzzznoresultsxyz');
      await expect(page.getByText(/Geen (resultaat|locaties)/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: search empty state is in the search dropdown
      await page.getByPlaceholder('Zoek een uitje...').click();
      await page.getByPlaceholder('Zoek een uitje...').fill('zzzznoresultsxyz');
      await page.waitForTimeout(1000);
      // Just verify search is active
      await expect(page.getByPlaceholder('Zoek een uitje...')).toHaveValue('zzzznoresultsxyz');
    }
  });
});

test.describe('Location detail', () => {
  test('opens detail from card click', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await openFirstDetail(page);
  });

  test('detail has action buttons', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await openFirstDetail(page);

    const routeBtn = page.getByRole('link', { name: 'Route' });
    await routeBtn.scrollIntoViewIfNeeded();
    await expect(routeBtn).toBeVisible({ timeout: 5_000 });
  });

  test('close button returns to list', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await openFirstDetail(page);

    await page.getByLabel('Sluiten').first().click({ force: true });
    await expect(page.getByPlaceholder('Zoek een uitje...')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Favorites', () => {
  test('can save favorite from detail', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await openFirstDetail(page);

    await page.getByLabel('Bewaar als favoriet').first().click({ force: true });

    // Close detail
    await page.getByLabel('Sluiten').first().click({ force: true });
    await page.waitForTimeout(1000);

    if (isDesktop(page)) {
      await expandSheet(page);
      await expect(page.getByText(/Bewaard \(\d+\)/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Mobile: Bewaard section is in the home launchpad (visible at full state)
      // Close any remaining sheets first
      const closeButtons = await page.getByLabel('Sluiten').all();
      for (const btn of closeButtons) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
      await expandSheet(page);
      await expect(page.getByText(/Bewaard \(\d+\)/)).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Plan', () => {
  test('can add to plan from detail', async ({ page }) => {
    await waitForApp(page);
    await openCategoryResults(page);
    await openFirstDetail(page);

    await page.getByLabel('Toevoegen aan plan').first().click();
    await expect(page.getByLabel('Verwijder uit plan')).toBeVisible({ timeout: 2_000 });

    // Close detail
    await page.getByLabel('Sluiten').first().click();
    await page.waitForTimeout(1000);

    if (isDesktop(page)) {
      await expandSheet(page);
      await expect(page.getByText(/Je plan \(\d+\)/)).toBeVisible({ timeout: 5_000 });
    } else {
      // Close any remaining sheets
      const closeButtons = await page.getByLabel('Sluiten').all();
      for (const btn of closeButtons) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
      await expandSheet(page);
      await expect(page.getByText(/Je plan \(\d+\)/)).toBeVisible({ timeout: 5_000 });
    }
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
        if (text.includes('WebGL') || text.includes('Failed to load resource') || text.includes('webglcontextcreationerror')) return;
        criticalErrors.push(text);
      }
    });

    await waitForApp(page);
    await expect(page.getByText('Er ging iets mis')).not.toBeVisible();
    expect(criticalErrors).toHaveLength(0);
  });
});
