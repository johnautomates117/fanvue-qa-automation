const { test, expect } = require('@playwright/test');

test.describe('Fanvue Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
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

  test('homepage loads with correct title', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('fanvue');
    
    // Check for any major heading - the site has many h1, h2, h6 elements
    const headings = await page.locator('h1, h2').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('main navigation elements are present', async ({ page }) => {
    // The site uses a complex navigation structure
    // Look for actual links we saw in the accessibility tree
    const navigationLinks = [
      'Login',
      'Sign Up',
      'fanvue AI',
      'Our Mission',
      'Support'
    ];
    
    let foundLinks = 0;
    for (const linkText of navigationLinks) {
      const link = page.locator(`a:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 1000 })) {
        foundLinks++;
      }
    }
    
    // At least some navigation links should be present
    expect(foundLinks).toBeGreaterThan(2);
  });

  test('hero section is displayed', async ({ page }) => {
    // Based on the actual content, look for the main heading
    const mainHeading = page.locator('h1:has-text("Platform"), h1:has-text("CREATORS")');
    const headingCount = await mainHeading.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for CTA buttons - "Become a Creator" is prominent
    const ctaButton = page.locator('a:has-text("Become a Creator"), a:has-text("Sign up")');
    const ctaCount = await ctaButton.count();
    expect(ctaCount).toBeGreaterThan(0);
  });

  test('page loads within performance budget', async ({ page }) => {
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
    
    console.log('Performance Metrics:', {
      domContentLoaded: `${metrics.domContentLoaded}ms`,
      loadComplete: `${metrics.loadComplete}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint}ms`,
      domInteractive: `${metrics.domInteractive}ms`
    });
    
    // Industry standard thresholds
    expect(metrics.loadComplete).toBeLessThan(10000); // 10 seconds
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(3000); // 3 seconds
    }
  });

  test('essential page elements are accessible', async ({ page }) => {
    // Check for essential elements based on what we know exists
    const essentialChecks = [
      { name: 'images', selector: 'img', minCount: 1 },
      { name: 'links', selector: 'a', minCount: 5 },
      { name: 'headings', selector: 'h1, h2, h3, h4, h5, h6', minCount: 3 },
      { name: 'main content areas', selector: 'section, main', minCount: 1 }
    ];
    
    for (const check of essentialChecks) {
      const count = await page.locator(check.selector).count();
      expect(count).toBeGreaterThanOrEqual(check.minCount);
    }
  });
});