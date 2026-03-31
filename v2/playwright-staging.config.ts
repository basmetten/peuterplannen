import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 3,
  reporter: 'list',
  timeout: 45_000,

  use: {
    baseURL: 'https://staging.peuterplannen.nl',
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
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 664 },
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'mobile-touch',
      testMatch: /touch-gestures/,
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 664 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'desktop',
      testIgnore: /touch-gestures/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  // No webServer — testing against live staging
});
