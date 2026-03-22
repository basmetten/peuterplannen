import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8771';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['iPhone 14'],
        // Inject CSS to disable animations for stable screenshots
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        viewport: { width: 1280, height: 800 },
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
  ],
  webServer: {
    command: 'npx serve -l 8771 --no-clipboard .',
    url: `${BASE_URL}/app.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
