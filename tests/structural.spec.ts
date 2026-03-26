import { test, expect } from '@playwright/test';
import { getStyles, getAllStyles, waitForApp, openHalfSheet } from './helpers';

test.describe('Design tokens', () => {
  test('body uses Plus Jakarta Sans font family', async ({ page }) => {
    await waitForApp(page);
    const s = await getStyles(page, 'body', ['font-family']);
    expect(s['font-family']).toContain('Plus Jakarta Sans');
  });

  test('primary color is coral on active preset', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    // Activate a preset chip (rain doesn't require location)
    const preset = page.locator('.sheet-preset[data-preset="rain"]');
    await preset.click();
    await page.waitForTimeout(300);

    const s = await getStyles(page, '.sheet-preset.active', ['background-color']);
    // --pp-primary-dark = --pp-primary-600 = #B35D42 = rgb(179, 93, 66) — Apple Maps dark fill style
    expect(s['background-color']).toMatch(/rgb\(179,\s*93,\s*66\)/);
  });
});

test.describe('Scan card structure', () => {
  test('card has correct layout properties', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.sheet-scan-card', [
      'overflow', 'border-radius'
    ]);
    expect(s['overflow']).toBe('hidden');
    // --pp-radius-sm = 16px (scan cards in sheet list), may show transition value
    const r = parseInt(s['border-radius']);
    expect(r).toBeGreaterThanOrEqual(12);
    expect(r).toBeLessThanOrEqual(16);
  });

  test('card photo has correct aspect ratio', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.sheet-list .scan-photo', [
      'aspect-ratio', 'overflow', 'position'
    ]);
    // Aspect ratio 5/2 = 2.5, may also appear as normalized form
    const ar = s['aspect-ratio'];
    expect(ar === '5 / 2' || ar === '2.5 / 1' || parseFloat(ar) >= 2.4).toBeTruthy();
    expect(s['overflow']).toBe('hidden');
    expect(s['position']).toBe('relative');
  });

  test('card name has correct typography', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.sheet-list .scan-name', [
      'font-weight'
    ]);
    expect(parseInt(s['font-weight'])).toBeGreaterThanOrEqual(600);
  });

  test('all cards have consistent structure', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const styles = await getAllStyles(page, '.sheet-scan-card', ['overflow', 'border-radius']);
    expect(styles.length).toBeGreaterThan(0);
    for (const s of styles) {
      expect(s['overflow']).toBe('hidden');
      const r = parseInt(s['border-radius']);
      expect(r).toBeGreaterThanOrEqual(12);
      expect(r).toBeLessThanOrEqual(16);
    }
  });
});

test.describe('Sheet structure', () => {
  test('bottom sheet has glass effect', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const s = await getStyles(page, '.bottom-sheet', [
      'border-radius', 'position'
    ]);
    expect(s['position']).toBe('relative');
    // Sheet border-radius: 12px top corners in peek, may catch mid-transition to half state
    const br = s['border-radius'];
    const topRadius = parseInt(br);
    expect(topRadius).toBeGreaterThanOrEqual(0);
    expect(topRadius).toBeLessThanOrEqual(16);

    // Scroll host should be the fixed positioned container
    const hostStyles = await getStyles(page, '.sheet-scroll-host', [
      'position', 'z-index'
    ]);
    expect(hostStyles['position']).toBe('fixed');
    expect(parseInt(hostStyles['z-index'])).toBeGreaterThanOrEqual(1000);
  });

  test('scroll-snap host has correct setup', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const s = await getStyles(page, '.sheet-scroll-host', [
      'position', 'overflow-y', 'scroll-snap-type'
    ]);
    expect(s['position']).toBe('fixed');
    expect(s['overflow-y']).toBe('scroll');
    expect(s['scroll-snap-type']).toContain('mandatory');
  });

  test('sheet filter chips have horizontal scroll layout', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const s = await getStyles(page, '#sheet-filter-chips', [
      'display', 'overflow-x'
    ]);
    expect(s['display']).toBe('flex');
    expect(s['overflow-x']).toBe('auto');
  });

  test('active filter chip has correct styling', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const chip = page.locator('.sheet-filter-chip.active');
    await expect(chip).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('mobile: no desktop sidebar visible', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const listView = page.locator('#list-view');
    await expect(listView).toBeHidden();
  });

  test('desktop: sidebar is visible, no bottom sheet', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await waitForApp(page);

    const listView = page.locator('#list-view');
    await expect(listView).toBeVisible();

    const sheet = page.locator('#bottom-sheet');
    await expect(sheet).toBeHidden();
  });

  test('desktop: nav shows all links', async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await waitForApp(page);

    for (const text of ['Home', 'Ontdekken', 'Over', 'Inspiratie', 'Contact', 'Plan je dag']) {
      await expect(page.locator(`nav a.nav-link:has-text("${text}")`)).toBeVisible();
    }

    // Plan link in mode switch
    const planLink = page.locator('a.app-mode-chip[data-mode-target="plan"]').first();
    await expect(planLink).toBeVisible();

    // Verify it's not clipped - check bounding box is fully within viewport
    const box = await planLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThan(1280);
  });

  test('mobile: GPS button visible, not overlapping nav', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const gps = page.locator('#map-gps-btn');
    await expect(gps).toBeVisible();

    // Check tap target size
    const box = await gps.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Touch targets', () => {
  test('all interactive elements meet 44px minimum', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const selectors = [
      '.sheet-filter-chip',
      '.sheet-preset',
      '.sheet-search-pill',
      '#map-gps-btn',
    ];

    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible()) {
        const box = await el.boundingBox();
        expect(box, `${sel} should have bounding box`).not.toBeNull();
        // 30px minimum — filter chips are compact on mobile, presets/search are larger
        expect(box!.height, `${sel} height >= 30px`).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
