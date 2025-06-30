import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Import Sentry for error tracking integration
import * as Sentry from '@sentry/node';

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.CI ? 'ci' : 'local',
    tracesSampleRate: 1.0,
  });
}

export default defineConfig({
  testDir: './tests',
  // Exclude visual tests from main test run
  testIgnore: '**/visual/**',
  timeout: 30 * 1000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      animations: 'disabled',
      threshold: 0.2,
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    // GitHub Actions reporter for CI
    process.env.CI ? ['github'] : null,
    // Custom reporter for TestRail integration
    ['./tests/reporters/testrail-reporter.ts'],
  ].filter(Boolean) as any,
  
  use: {
    baseURL: 'https://www.fanvue.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Custom test attributes for better organization
    testIdAttribute: 'data-testid',
    // Browser context options
    contextOptions: {
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 },
    },
  },
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: path.join(__dirname, 'tests/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'tests/global-teardown.ts'),
  
  // Web server configuration for local testing
  webServer: process.env.USE_LOCAL_SERVER ? {
    command: 'npm run start',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  } : undefined,
});