import { Page } from '@playwright/test';

export async function getStyles(page: Page, selector: string, props: string[]): Promise<Record<string, string>> {
  return page.evaluate(({ sel, props }) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element not found: ${sel}`);
    const cs = getComputedStyle(el);
    const r: Record<string, string> = {};
    for (const p of props) r[p] = cs.getPropertyValue(p);
    return r;
  }, { sel: selector, props });
}

export async function getAllStyles(page: Page, selector: string, props: string[]): Promise<Record<string, string>[]> {
  return page.evaluate(({ sel, props }) => {
    return Array.from(document.querySelectorAll(sel)).map(el => {
      const cs = getComputedStyle(el);
      const r: Record<string, string> = {};
      for (const p of props) r[p] = cs.getPropertyValue(p);
      return r;
    });
  }, { sel: selector, props });
}

export async function waitForApp(page: Page) {
  // Pre-set cookie consent so the banner never blocks interactions
  await page.addInitScript(() => {
    localStorage.setItem('pp_consent', JSON.stringify({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    }));
  });
  await page.goto('/app.html');
  await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });
}

/** Click a sheet tab via JS (no-op if tabs removed per PRD content refresh) */
export async function clickSheetTab(page: Page, tab: string) {
  await page.evaluate((t) => {
    const tabEl = document.querySelector(`.sheet-tab[data-tab="${t}"]`) as HTMLElement;
    if (tabEl) { tabEl.click(); return; }
    // Tabs removed — use setSheetState to move to half instead
    if (typeof (window as any).setSheetState === 'function') {
      (window as any).setSheetState('half');
    }
  }, tab);
}

export async function openHalfSheet(page: Page) {
  await waitForApp(page);
  // Move sheet to half state directly
  await page.evaluate(() => {
    if (typeof (window as any).setSheetState === 'function') {
      (window as any).setSheetState('half');
    }
  });
  await page.locator('.sheet-scan-card').first().waitFor({ state: 'visible', timeout: 10000 });
}
