import { defineConfig, devices } from '@playwright/test';

/**
 * MedTrace Playwright E2E Configuration
 * Configured for real browser execution using local Chrome channel,
 * deterministic serial execution, HTML reporting, failure screenshots,
 * video retention, and trace generation.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // Serial execution to ensure deterministic database state transitions
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    channel: 'chrome',
    headless: true,
  },
  projects: [
    {
      name: 'chromium-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
