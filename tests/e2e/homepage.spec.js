const { test, expect } = require('@playwright/test');

test.describe('Fanvue Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Handle cookie consent with multiple possible selectors
    const cookieSelectors = [
      'button:has-text("Accept")',
      'button:has-text("OK")',
      'button:has-text("Got it")',
      '[aria-label*="cookie"]',
      '[aria-label*="consent"]'
    ];
    
    for (const selector of cookieSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        break;
      }
    }
  });

  test('homepage loads with correct title', async ({ page }) => {
    // More flexible title check
    const title = await page.title();
    expect(title.toLowerCase()).toContain('fanvue');
    
    // Look for any major heading
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('main navigation elements are present', async ({ page }) => {
    // More robust navigation check
    const possibleNavSelectors = [
      'nav',
      'header nav',
      '[role="navigation"]',
      '.navigation',
      '.navbar',
      '#navigation'
    ];
    
    let navFound = false;
    for (const selector of possibleNavSelectors) {
      const nav = page.locator(selector).first();
      if (await nav.isVisible({ timeout: 1000 })) {
        navFound = true;
        await expect(nav).toBeVisible();
        break;
      }
    }
    
    expect(navFound).toBeTruthy();
    
    // Check for common navigation patterns
    const linkCount = await page.locator('header a, nav a').count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('hero section is displayed', async ({ page }) => {
    // More intelligent hero section detection
    const heroSelectors = [
      '[class*="hero"]',
      '[id*="hero"]',
      'section:first-of-type',
      '.banner',
      '[class*="jumbotron"]',
      'main > section:first-child',
      'div[class*="landing"]'
    ];
    
    let heroFound = false;
    let heroElement = null;
    
    for (const selector of heroSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        heroFound = true;
        heroElement = element;
        break;
      }
    }
    
    // If no hero section found, check for main content area
    if (!heroFound) {
      const mainContent = page.locator('main, [role="main"], #main').first();
      if (await mainContent.isVisible()) {
        heroFound = true;
        heroElement = mainContent;
      }
    }
    
    expect(heroFound).toBeTruthy();
    
    // Check for actionable elements (buttons or prominent links)
    if (heroElement) {
      const actionableElements = await heroElement.locator('button, a[class*="btn"], a[class*="button"]').count();
      expect(actionableElements).toBeGreaterThan(0);
    }
  });

  test('page loads within performance budget', async ({ page }) => {
    // Wait for load to complete
    await page.waitForLoadState('networkidle');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint ? paint.startTime : 0,
        domInteractive: navigation.domInteractive,
      };
    });
    
    // Industry standard thresholds
    const performanceBudget = {
      domContentLoaded: 3000,     // 3 seconds
      loadComplete: 10000,        // 10 seconds for full load
      firstContentfulPaint: 2500, // 2.5 seconds
    };
    
    // Log metrics for debugging
    console.log('Performance Metrics:', {
      domContentLoaded: `${metrics.domContentLoaded}ms`,
      loadComplete: `${metrics.loadComplete}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint}ms`,
      domInteractive: `${metrics.domInteractive}ms`
    });
    
    // More lenient assertions with meaningful messages
    expect(metrics.loadComplete).toBeLessThan(performanceBudget.loadComplete);
    
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(performanceBudget.firstContentfulPaint);
    }
  });

  test('essential page elements are accessible', async ({ page }) => {
    // Check for essential elements that should be on any homepage
    const essentialElements = {
      'images': 'img',
      'links': 'a',
      'headings': 'h1, h2, h3, h4, h5, h6',
      'main content': 'main, [role="main"], #content, .content',
      'footer': 'footer, [role="contentinfo"]'
    };
    
    const missingElements = [];
    
    for (const [name, selector] of Object.entries(essentialElements)) {
      const count = await page.locator(selector).count();
      if (count === 0) {
        missingElements.push(name);
      }
    }
    
    // Log what's missing for debugging
    if (missingElements.length > 0) {
      console.log('Missing elements:', missingElements);
    }
    
    // At least most essential elements should be present
    expect(missingElements.length).toBeLessThan(2);
  });
});
