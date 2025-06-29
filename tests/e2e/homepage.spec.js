const { test, expect } = require('@playwright/test');

test.describe('Fanvue Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Handle cookie consent if present
    const cookieButton = page.locator('button:has-text("Accept"), button:has-text("OK")').first();
    if (await cookieButton.isVisible({ timeout: 3000 })) {
      await cookieButton.click();
    }
  });

  test('homepage loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Fanvue/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('main navigation elements are present', async ({ page }) => {
    // Check for navigation
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
    
    // Check for key navigation items
    const navItems = [
      { text: 'Browse', selector: 'a:has-text("Browse"), button:has-text("Browse")' },
      { text: 'Sign Up', selector: 'a:has-text("Sign"), button:has-text("Sign")' }
    ];
    
    for (const item of navItems) {
      const element = page.locator(item.selector).first();
      if (await element.isVisible()) {
        await expect(element).toBeEnabled();
      }
    }
  });

  test('hero section is displayed', async ({ page }) => {
    // Look for main hero section
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
    
    // Check for call-to-action buttons
    const ctaButtons = page.locator('button, a').filter({ hasText: /start|join|sign|browse/i });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('page loads within performance budget', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    expect(metrics.loadComplete).toBeLessThan(5000); // 5 seconds max
  });
});