import { defineConfig, devices } from '@playwright/test';

/**
 * Validation testing configuration - uses existing dev server
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001', // Use existing dev server
    headless: false, // Run in headed mode for observation
    trace: 'on',
    actionTimeout: 45000,
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - use existing dev server running on port 3000
});