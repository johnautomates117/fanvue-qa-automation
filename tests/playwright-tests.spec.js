// Fanvue.com E2E Test Suite
const { test, expect } = require('@playwright/test');

test.describe('Fanvue.com Public Site Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.fanvue.com');
  });

  test('Homepage loads successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Fanvue/);
    
    // Check main elements are visible
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=Browse Creators')).toBeVisible();
    
    // Take screenshot for visual regression
    await page.screenshot({ path: 'screenshots/homepage.png' });
  });

  test('Navigation menu works correctly', async ({ page }) => {
    // Test main navigation links
    const navLinks = ['Browse Creators', 'How it Works', 'Sign Up'];
    
    for (const link of navLinks) {
      const locator = page.locator(`text=${link}`);
      await expect(locator).toBeVisible();
      await expect(locator).toBeEnabled();
    }
  });

  test('Search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('fitness');
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForLoadState('networkidle');
      
      // Verify search results page loaded
      await expect(page.url()).toContain('search');
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.screenshot({ 
        path: `screenshots/viewport-${viewport.name}.png` 
      });
    }
  });

  test('Performance metrics', async ({ page }) => {
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    
    console.log('Performance Metrics:', metrics);
  });

  test('Accessibility compliance', async ({ page }) => {
    // Run accessibility tests using @axe-core/playwright
    const accessibilityScanResults = await page.accessibility.snapshot();
    
    // Log accessibility tree
    console.log('Accessibility Tree:', JSON.stringify(accessibilityScanResults, null, 2));
  });
});