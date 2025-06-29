const { test, expect, devices } = require('@playwright/test');

test.describe('Fanvue Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    test(`displays correctly on ${viewport.name}`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Check that page loads without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Allow small margin for scrollbar
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
      
      // Check navigation visibility based on viewport
      if (viewport.name === 'Mobile') {
        // On mobile, navigation might be hidden behind a menu button
        const menuButton = await page.locator('button[aria-label*="menu"], button[aria-haspopup="menu"]').isVisible();
        const desktopNav = await page.locator('nav.w-nav-menu').isVisible();
        
        // Either menu button should be visible OR nav should be visible (depends on implementation)
        expect(menuButton || desktopNav).toBeTruthy();
      } else {
        // On larger screens, check for visible navigation links
        const navLinks = await page.locator('a:has-text("Login"), a:has-text("Sign Up")').first().isVisible();
        expect(navLinks).toBeTruthy();
      }
      
      // Take screenshot for visual reference
      await page.screenshot({ 
        path: `test-results/screenshots/responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: false 
      });
    });
  }

  test('images are responsive', async ({ page }) => {
    await page.goto('/');
    
    // Check that images don't overflow their containers
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 5)) { // Check first 5 images
      const isVisible = await img.isVisible();
      if (isVisible) {
        const overflow = await img.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.right > window.innerWidth || rect.width > window.innerWidth;
        });
        
        expect(overflow).toBeFalsy();
      }
    }
  });

  test('text remains readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that text elements have reasonable font sizes
    const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6').all();
    
    for (const element of textElements.slice(0, 10)) { // Check first 10 text elements
      const fontSize = await element.evaluate(el => {
        return parseInt(window.getComputedStyle(el).fontSize);
      });
      
      // Font size should be at least 12px for readability
      expect(fontSize).toBeGreaterThanOrEqual(12);
    }
  });
});