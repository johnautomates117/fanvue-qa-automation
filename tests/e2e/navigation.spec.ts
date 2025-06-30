import { test, expect, Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { NavigationPage } from '../pages/NavigationPage';
import { TestHelper } from '../helpers/TestHelper';

test.describe('Fanvue Navigation Tests', () => {
  let page: Page;
  let homePage: HomePage;
  let navigationPage: NavigationPage;
  let testHelper: TestHelper;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    homePage = new HomePage(page);
    navigationPage = new NavigationPage(page);
    testHelper = new TestHelper(page);
    
    await homePage.navigate();
    await testHelper.handleCookieConsent();
  });

  test('navigation links are functional and lead to correct pages', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2001' });
    
    const navLinks = await navigationPage.getAllNavigationLinks();
    
    for (const link of navLinks) {
      const linkText = await link.textContent();
      const href = await link.getAttribute('href');
      
      console.log(`Testing navigation link: ${linkText} -> ${href}`);
      
      // Skip external links
      if (href?.startsWith('http') && !href.includes('fanvue.com')) {
        continue;
      }
      
      // Test internal navigation
      if (href && !href.startsWith('#')) {
        const [response] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes(href)),
          link.click(),
        ]);
        
        expect(response.status()).toBeLessThan(400);
        
        // Navigate back for next test
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });

  test('sign up flow is accessible and functional', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2002' });
    
    const signUpButton = await navigationPage.getSignUpButton();
    expect(signUpButton).toBeTruthy();
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForNavigation({ url: /signup|creator|register/ }),
      signUpButton.click(),
    ]);
    
    // Verify we're on the signup page
    const url = page.url();
    expect(url).toMatch(/signup|creator|register/);
    
    // Check for signup form elements
    const emailInput = await page.locator('input[type="email"], input[name*="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Test form validation
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign up")').first();
    await submitButton.click();
    
    // Should show validation errors
    const errorMessage = await page.locator('.error, [role="alert"], .invalid-feedback').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('login flow is accessible', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2003' });
    
    const loginLink = await navigationPage.getLoginLink();
    expect(loginLink).toBeTruthy();
    
    await Promise.all([
      page.waitForNavigation({ url: /signin|login/ }),
      loginLink.click(),
    ]);
    
    // Verify login page elements
    const emailInput = await page.locator('input[type="email"], input[name*="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('footer contains all required links and information', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2004' });
    
    const footer = await navigationPage.getFooter();
    await footer.scrollIntoViewIfNeeded();
    
    // Check for essential footer links
    const footerLinks = [
      { text: 'Privacy', pattern: /privacy/ },
      { text: 'Terms', pattern: /terms/ },
      { text: 'Cookie', pattern: /cookie/ },
    ];
    
    for (const link of footerLinks) {
      const element = await page.locator(`footer a:has-text("${link.text}")`).first();
      if (await element.count() > 0) {
        const href = await element.getAttribute('href');
        expect(href).toMatch(link.pattern);
      }
    }
    
    // Check for social media links
    const socialLinks = await page.locator('footer a[href*="instagram"], footer a[href*="twitter"], footer a[href*="x.com"]').count();
    expect(socialLinks).toBeGreaterThan(0);
  });

  test('mobile menu functions correctly', async ({ isMobile }) => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2005' });
    
    if (!isMobile) {
      // Set mobile viewport for desktop tests
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
    }
    
    // Find and click mobile menu button
    const menuButton = await navigationPage.getMobileMenuButton();
    expect(menuButton).toBeTruthy();
    
    await menuButton.click();
    
    // Wait for menu to open
    await page.waitForTimeout(500);
    
    // Check if navigation items are visible
    const mobileNavItems = await page.locator('nav a:visible, [role="navigation"] a:visible').count();
    expect(mobileNavItems).toBeGreaterThan(0);
    
    // Test menu close functionality
    const closeButton = await page.locator('[aria-label*="close"], button:has-text("close")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // Menu should be hidden
      const menuVisible = await page.locator('nav[aria-expanded="true"]').isVisible();
      expect(menuVisible).toBeFalsy();
    }
  });

  test('navigation maintains state across page refreshes', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2006' });
    
    // Navigate to a specific page
    const aboutLink = await page.locator('a:has-text("Mission"), a:has-text("About")').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');
      
      const urlBefore = page.url();
      
      // Refresh the page
      await page.reload();
      
      const urlAfter = page.url();
      expect(urlAfter).toBe(urlBefore);
      
      // Check if navigation highlighting is maintained
      const activeNavItem = await page.locator('nav a[aria-current="page"], nav a.active').first();
      if (await activeNavItem.count() > 0) {
        const isHighlighted = await activeNavItem.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.fontWeight === 'bold' || 
                 styles.textDecoration.includes('underline') ||
                 styles.borderBottomWidth !== '0px';
        });
        expect(isHighlighted).toBeTruthy();
      }
    }
  });

  test('breadcrumb navigation works correctly', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C2007' });
    
    // Navigate to a deeper page first
    const deepLink = await page.locator('a[href*="/support"], a[href*="/help"]').first();
    if (await deepLink.isVisible()) {
      await deepLink.click();
      await page.waitForLoadState('domcontentloaded');
      
      // Check for breadcrumbs
      const breadcrumbs = await page.locator('nav[aria-label*="breadcrumb"], .breadcrumb').first();
      if (await breadcrumbs.count() > 0) {
        const breadcrumbItems = await breadcrumbs.locator('a, span').all();
        expect(breadcrumbItems.length).toBeGreaterThan(1);
        
        // Test breadcrumb navigation
        const homeLink = await breadcrumbs.locator('a:has-text("Home")').first();
        if (await homeLink.count() > 0) {
          await homeLink.click();
          await expect(page).toHaveURL('/');
        }
      }
    }
  });
});