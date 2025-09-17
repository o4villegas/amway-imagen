import { defineConfig, devices } from '@playwright/test';

/**
 * Environment detection for browser configuration
 */
const isWSL = !!process.env.WSL_DISTRO_NAME;
const isCI = !!process.env.CI;
const hasDisplay = !!process.env.DISPLAY;

// Use headless mode in WSL, CI, or when no display is available
const useHeadless = isWSL || isCI || !hasDisplay;

// Dynamic server detection - prefer preview server for testing
const testPort = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT) : 8788;
const testCommand = testPort === 8788 ? 'npm run preview' : 'npm run dev';
const baseURL = process.env.TEST_BASE_URL || `http://localhost:${testPort}`;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Use headless mode when appropriate */
    headless: useHeadless,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Increase timeouts for slower environments */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: testCommand,
    url: baseURL,
    reuseExistingServer: false, // Force clean server to prevent conflicts
    timeout: 120 * 1000, // 2 minutes for Cloudflare to start
    env: {
      // Ensure consistent environment for server startup
      NODE_ENV: process.env.NODE_ENV || 'test',
    },
  },
});