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
  await page.goto('/app.html');
  await page.locator('#map').waitFor({ state: 'visible', timeout: 15000 });
}

export async function openHalfSheet(page: Page) {
  await waitForApp(page);
  await page.getByRole('button', { name: 'Ontdek' }).click();
  await page.locator('.compact-card').first().waitFor({ state: 'visible', timeout: 10000 });
}
