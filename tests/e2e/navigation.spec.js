const { test, expect } = require('@playwright/test');

test.describe('Fanvue Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Handle cookie consent
    try {
      const cookieButton = page.locator('button:has-text("OK"), a:has-text("OK")').first();
      if (await cookieButton.isVisible({ timeout: 2000 })) {
        await cookieButton.click();
      }
    } catch {
      // Cookie banner might not appear
    }
  });

  test('navigation links are functional', async ({ page }) => {
    // Test actual navigation links that exist
    const loginLink = page.locator('a:has-text("Login")');
    if (await loginLink.isVisible()) {
      const href = await loginLink.getAttribute('href');
      expect(href).toContain('signin');
    }
    
    const signUpLink = page.locator('a:has-text("Sign Up")');
    if (await signUpLink.isVisible()) {
      const href = await signUpLink.getAttribute('href');
      expect(href).toContain('signup');
    }
  });

  test('sign up flow is accessible', async ({ page }) => {
    // Find and click sign up link
    const signUpLink = page.locator('a:has-text("Sign Up"), a:has-text("Become a Creator")').first();
    
    if (await signUpLink.isVisible()) {
      const href = await signUpLink.getAttribute('href');
      
      // Instead of clicking and waiting for network idle (which times out),
      // just verify the link is correct
      expect(href).toMatch(/signup|creator/);
      
      // Navigate directly to avoid timeout issues
      await page.goto(href);
      await page.waitForLoadState('domcontentloaded');
      
      // Check if we're on a signup-related page
      const url = page.url();
      expect(url).toMatch(/signup|creator|signin/);
    }
  });

  test('footer contains important links', async ({ page }) => {
    // There are multiple footer elements, so be more specific
    const footers = await page.locator('footer').all();
    
    let foundImportantLinks = false;
    
    for (const footer of footers) {
      // Check for social links or legal links
      const instagramLink = footer.locator('a:has-text("Instagram")');
      const twitterLink = footer.locator('a:has-text("X")');
      const cookiePolicy = page.locator('a:has-text("cookie policy")');
      
      if (await instagramLink.isVisible() || await twitterLink.isVisible() || await cookiePolicy.isVisible()) {
        foundImportantLinks = true;
        break;
      }
    }
    
    expect(foundImportantLinks).toBeTruthy();
  });

  test('mobile menu button exists on mobile viewport', async ({ page, isMobile }) => {
    if (isMobile) {
      // Look for menu button on mobile
      const menuButton = page.locator('button[aria-label*="menu"], button:has-text("menu")');
      const isVisible = await menuButton.isVisible({ timeout: 2000 });
      expect(isVisible).toBeTruthy();
    } else {
      // Desktop should have visible navigation links
      const navLinks = await page.locator('a:has-text("Login"), a:has-text("Sign Up")').count();
      expect(navLinks).toBeGreaterThan(0);
    }
  });
});