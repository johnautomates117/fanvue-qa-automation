const { test, expect, devices } = require('@playwright/test');

test.describe('Fanvue Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', device: devices['iPhone 12'] },
    { name: 'Tablet', device: devices['iPad'] },
    { name: 'Desktop', viewport: { width: 1920, height: 1080 } }
  ];

  for (const viewport of viewports) {
    test(`displays correctly on ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...viewport.device,
        ...viewport.viewport ? { viewport: viewport.viewport } : {}
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Check that page loads without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin
      
      // Check main elements are visible
      await expect(page.locator('nav, header').first()).toBeVisible();
      
      // Take screenshot for visual reference
      await page.screenshot({ 
        path: `test-results/screenshots/responsive-${viewport.name}.png`,
        fullPage: false 
      });
      
      await context.close();
    });
  }
});