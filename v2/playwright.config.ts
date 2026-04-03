import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader'],
    },
  },

  projects: [
    {
      name: 'mobile',
      use: {
        // Use Chromium with iPhone 14 viewport (CI only installs Chromium)
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 664 },
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'mobile-touch',
      testMatch: /touch-gestures|sheet-navigation/,
      use: {
        // iPhone 14 with touch events enabled for gesture testing
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 664 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    command: 'npm run build && npx next start -p 3002',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
