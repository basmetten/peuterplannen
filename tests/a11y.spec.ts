import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('no critical or serious violations on app load', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .disableRules([
        'color-contrast', // Glass morphism makes contrast checking unreliable
        'page-has-heading-one', // SPA with dynamic content
      ])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (critical.length > 0) {
      const summary = critical.map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      );
      console.error('A11y violations:\n' + summary.join('\n'));
    }

    expect(critical).toHaveLength(0);
  });

  test('sheet tabs have proper roles', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Sheet tabs should be buttons (they act as tab navigation)
    const tabs = page.locator('.sheet-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const tag = await tabs.nth(i).evaluate((el) => el.tagName);
      expect(tag).toBe('BUTTON');
    }
  });

  test('filter modal has aria-modal', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    const modal = page.locator('#filter-modal');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('role', 'dialog');
  });

  test('scan cards have proper structure', async ({ page, isMobile }) => {
    if (isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('.scan-card').first()).toBeVisible({ timeout: 15000 });

    // Cards should be article elements
    const firstCard = page.locator('.scan-card').first();
    const tag = await firstCard.evaluate((el) => el.tagName);
    expect(tag).toBe('ARTICLE');

    // Fav button should have aria-label
    const favBtn = firstCard.locator('.scan-fav');
    await expect(favBtn).toHaveAttribute('aria-label', /Opslaan|Verwijder/);

    // Photo should have alt text
    const img = firstCard.locator('.scan-photo img');
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt!.length).toBeGreaterThan(0);
  });

  test('images have alt attributes', async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Wait for content
    await page.waitForTimeout(3000);

    // Check all visible images have alt
    const images = page.locator('img:visible');
    const count = await images.count();

    let missingAlt = 0;
    for (let i = 0; i < Math.min(count, 30); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      // Decorative images with role="presentation" or empty alt are fine
      if (alt === null && role !== 'presentation') {
        missingAlt++;
      }
    }

    // Allow some decorative images but flag excessive missing alt
    expect(missingAlt).toBeLessThan(5);
  });

  test('no critical violations in half state with cards', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/app.html');
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    // Open half state
    await page.getByRole('button', { name: 'Ontdek' }).click();
    await expect(page.locator('.compact-card').first()).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'page-has-heading-one'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(critical).toHaveLength(0);
  });
});
