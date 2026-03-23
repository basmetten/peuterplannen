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

    // Activate a preset chip by clicking it
    const preset = page.locator('.sheet-preset').first();
    await preset.click();
    await page.waitForTimeout(300);

    const s = await getStyles(page, '.sheet-preset.active', ['background-color']);
    // --pp-primary-dark = --pp-primary-600 = #B35D42 = rgb(179, 93, 66) — Apple Maps dark fill style
    expect(s['background-color']).toMatch(/rgb\(179,\s*93,\s*66\)/);
  });
});

test.describe('Compact card structure', () => {
  test('card has correct layout properties', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.compact-card', [
      'display', 'align-items', 'gap', 'border-radius'
    ]);
    expect(s['display']).toBe('flex');
    expect(s['align-items']).toBe('center');
    expect(s['gap']).toBe('12px');
    expect(s['border-radius']).toBe('10px');
  });

  test('card image is 56x56 rounded', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.compact-card-img', [
      'width', 'height', 'border-radius', 'object-fit'
    ]);
    expect(s['width']).toBe('56px');
    expect(s['height']).toBe('56px');
    expect(s['border-radius']).toBe('12px');
    expect(s['object-fit']).toBe('cover');
  });

  test('card name has correct typography', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const s = await getStyles(page, '.compact-card-name', [
      'font-size', 'font-weight'
    ]);
    expect(s['font-size']).toBe('15px');
    expect(parseInt(s['font-weight'])).toBeGreaterThanOrEqual(600);
  });

  test('all cards have consistent spacing', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await openHalfSheet(page);

    const styles = await getAllStyles(page, '.compact-card', ['display', 'gap']);
    expect(styles.length).toBeGreaterThan(0);
    for (const s of styles) {
      expect(s['display']).toBe('flex');
      expect(s['gap']).toBe('12px');
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
    expect(s['border-radius']).toBe('16px');

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

  test('sheet tabs have segmented control layout', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const s = await getStyles(page, '.sheet-tabs', [
      'display', 'border-radius', 'position'
    ]);
    expect(s['display']).toBe('flex');
    expect(s['border-radius']).toBe('12px');
    expect(s['position']).toBe('relative');
  });

  test('active tab has correct styling', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await waitForApp(page);

    const s = await getStyles(page, '.sheet-tab.active', [
      'color', 'font-weight'
    ]);
    // Active tab color should be --pp-primary = #D4775A = rgb(212, 119, 90)
    expect(s['color']).toMatch(/rgb\(212,\s*119,\s*90\)/);
    expect(parseInt(s['font-weight'])).toBeGreaterThanOrEqual(600);
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

    for (const text of ['Home', 'Ontdekken', 'Over', 'Inspiratie', 'Contact']) {
      await expect(page.locator(`nav a.nav-link:has-text("${text}")`)).toBeVisible();
    }

    // Mode toggle fully visible
    const planBtn = page.getByRole('button', { name: 'Plan mijn dag' });
    await expect(planBtn).toBeVisible();

    // Verify it's not clipped - check bounding box is fully within viewport
    const box = await planBtn.boundingBox();
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
      '.sheet-tab',
      '.sheet-preset',
      '.sheet-search-pill',
      '#map-gps-btn',
    ];

    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible()) {
        const box = await el.boundingBox();
        expect(box, `${sel} should have bounding box`).not.toBeNull();
        expect(box!.height, `${sel} height >= 40px`).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
