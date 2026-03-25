import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

/** Collect JS errors, ignoring known third-party CORS noise */
function collectErrors(page: any) {
  const errors: string[] = [];
  page.on('pageerror', (e: any) => {
    const msg = e.message || String(e);
    // Ignore Cloudflare Insights CORS errors (third-party, not our code)
    if (msg.includes('cloudflareinsights') || msg.includes('cdn-cgi')) return;
    errors.push(msg);
  });
  return errors;
}

test.describe('Geolocation', () => {

  test('granted — shows active state and sets location', async ({ page, context }) => {
    const errors = collectErrors(page);

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 52.3676, longitude: 4.9041 });
    await waitForApp(page);

    // Trigger GPS via JS (button visibility varies by viewport)
    await page.evaluate(() => (window as any).getCurrentLocation());

    // Wait for the geolocation module to reach active state
    await page.waitForFunction(() => {
      const btn = document.getElementById('gps-btn');
      return btn && btn.classList.contains('gps-active');
    }, { timeout: 15000 });

    // App container has location
    await expect(page.locator('#app-container')).toHaveClass(/has-location/);

    // GPS status element exists and is not in error/denied state
    const statusState = await page.evaluate(() => {
      const el = document.getElementById('gps-status');
      return { denied: el?.classList.contains('denied'), error: el?.classList.contains('error') };
    });
    expect(statusState.denied).toBeFalsy();
    expect(statusState.error).toBeFalsy();

    expect(errors).toHaveLength(0);
  });

  test('denied — status gets denied class with help text', async ({ page, context }) => {
    const errors = collectErrors(page);

    await context.clearPermissions();
    await waitForApp(page);

    // Clear cached denial
    await page.evaluate(() => {
      try { sessionStorage.removeItem('pp-geo-denied'); } catch {}
    });

    // Trigger GPS
    await page.evaluate(() => (window as any).getCurrentLocation());

    // Wait for denied state
    await page.waitForFunction(() => {
      const el = document.getElementById('gps-status');
      return el && el.classList.contains('denied');
    }, { timeout: 15000 });

    // Check denied UI content via evaluate (element may be in hidden sidebar on mobile)
    const deniedUI = await page.evaluate(() => {
      const el = document.getElementById('gps-status');
      if (!el) return { hasClass: false, text: '', hasCityLink: false, hasGuidance: false };
      return {
        hasClass: el.classList.contains('denied'),
        text: el.textContent || '',
        hasCityLink: !!el.querySelector('.gps-status-link'),
        hasGuidance: !!el.querySelector('.gps-guidance'),
      };
    });

    expect(deniedUI.hasClass).toBe(true);
    expect(deniedUI.text).toContain('geblokkeerd');
    expect(deniedUI.hasCityLink).toBe(true);
    expect(deniedUI.hasGuidance).toBe(true);

    expect(errors).toHaveLength(0);
  });

  test('manual city selection — sets location without GPS', async ({ page }) => {
    const errors = collectErrors(page);

    await waitForApp(page);

    // Set city via JS
    await page.evaluate(() => (window as any).setCity('Amsterdam'));

    // Wait for location to be set
    await page.waitForFunction(() => {
      const el = document.getElementById('app-container');
      return el && el.classList.contains('has-location');
    }, { timeout: 15000 });

    // Has-location set
    await expect(page.locator('#app-container')).toHaveClass(/has-location/);

    // GPS status is NOT in denied or error state
    const statusState = await page.evaluate(() => {
      const el = document.getElementById('gps-status');
      return {
        denied: el?.classList.contains('denied') ?? false,
        error: el?.classList.contains('error') ?? false,
      };
    });
    expect(statusState.denied).toBe(false);
    expect(statusState.error).toBe(false);

    expect(errors).toHaveLength(0);
  });

  test('second GPS request reuses active location', async ({ page, context }) => {
    const errors = collectErrors(page);

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 52.3676, longitude: 4.9041 });
    await waitForApp(page);

    // First request
    await page.evaluate(() => (window as any).getCurrentLocation());
    await page.waitForFunction(() => {
      const btn = document.getElementById('gps-btn');
      return btn && btn.classList.contains('gps-active');
    }, { timeout: 15000 });

    // Second request should resolve near-instantly (reuses active state)
    const elapsed = await page.evaluate(async () => {
      const start = Date.now();
      await (window as any).getCurrentLocation();
      return Date.now() - start;
    });
    expect(elapsed).toBeLessThan(500);

    expect(errors).toHaveLength(0);
  });

});
