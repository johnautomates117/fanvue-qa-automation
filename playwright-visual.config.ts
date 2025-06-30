import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30 * 1000,
  expect: {
    // Threshold for pixel differences (0-1, where 0 is identical)
    toHaveScreenshot: { 
      threshold: 0.2,
      maxDiffPixels: 100,
      animations: 'disabled',
      // Only capture viewport by default to reduce file size
      fullPage: false,
      // Mask dynamic elements
      mask: [
        // Add selectors for dynamic content that changes frequently
      ],
      stylePath: path.join(__dirname, 'tests/visual/visual-regression.css'),
    },
  },
  
  // Run tests sequentially for consistent results
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  
  // Limit workers to reduce memory usage
  workers: 1,
  
  reporter: [
    ['html', { outputFolder: 'visual-regression-report' }],
    ['json', { outputFile: 'visual-test-results.json' }],
    process.env.CI ? ['github'] : null,
  ].filter(Boolean) as any,
  
  use: {
    baseURL: 'https://www.fanvue.com',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Ensure consistent rendering
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    javaScriptEnabled: true,
    
    // Performance optimizations
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    },
    
    // Context options for consistency
    contextOptions: {
      reducedMotion: 'reduce',
      forcedColors: 'none',
    },
  },
  
  projects: [
    // Only test on one browser for visual regression to save time
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Disable service workers for consistency
        serviceWorkers: 'block',
      },
    },
    // Mobile viewport - only critical pages
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Only run for critical tests marked with @mobile
        grep: /@mobile/,
      },
    },
  ],
  
  // Output directory for screenshots
  snapshotDir: './tests/visual/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{projectName}/{testFilePath}/{testName}/{arg}{ext}',
});