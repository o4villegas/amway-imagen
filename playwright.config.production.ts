import { defineConfig, devices } from '@playwright/test';

/**
 * Production testing configuration - no local server needed
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: 1, // Run one at a time for production testing
  reporter: 'html',
  use: {
    baseURL: 'https://amway-imagen.lando555.workers.dev',
    headless: false, // Always run in headed mode for live testing
    trace: 'on',
    actionTimeout: 45000, // Increase timeout for production
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - testing against live production
});