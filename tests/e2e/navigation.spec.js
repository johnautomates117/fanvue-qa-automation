const { test, expect } = require('@playwright/test');

test.describe('Fanvue Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('browse creators link works', async ({ page }) => {
    // Find and click browse/creators link
    const browseLink = page.locator('a').filter({ hasText: /browse|creator/i }).first();
    
    if (await browseLink.isVisible()) {
      await browseLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a different page
      const url = page.url();
      expect(url).toContain('fanvue.com');
      
      // Check for content indicating creators page
      await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    }
  });

  test('sign up flow is accessible', async ({ page }) => {
    // Find sign up button/link
    const signUpLink = page.locator('a, button').filter({ hasText: /sign up|join|start/i }).first();
    
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify sign up page elements
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      await expect(emailInput.or(page.locator('h1:has-text("Sign")').first())).toBeVisible();
    }
  });

  test('footer links are present', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    
    // Check for common footer links
    const footerLinks = ['Privacy', 'Terms', 'About', 'Contact'];
    let foundLinks = 0;
    
    for (const linkText of footerLinks) {
      const link = footer.locator(`a:has-text("${linkText}")`).first();
      if (await link.isVisible()) {
        foundLinks++;
      }
    }
    
    // At least some footer links should be present
    expect(foundLinks).toBeGreaterThan(0);
  });
});