import { test, expect, Page } from '@playwright/test';
import { BasePage } from '../pages/BasePage';
import { HomePage } from '../pages/HomePage';
import { TestHelper } from '../helpers/TestHelper';
import * as Sentry from '@sentry/node';

test.describe('Fanvue Homepage Tests', () => {
  let page: Page;
  let homePage: HomePage;
  let testHelper: TestHelper;

  test.beforeEach(async ({ page: testPage, context }) => {
    page = testPage;
    homePage = new HomePage(page);
    testHelper = new TestHelper(page);
    
    // Set up request interception for performance monitoring
    await context.route('**/*', (route) => {
      const url = route.request().url();
      // Log slow requests to Sentry
      const startTime = Date.now();
      route.continue().then(() => {
        const duration = Date.now() - startTime;
        if (duration > 3000) {
          Sentry.captureMessage(`Slow request: ${url} took ${duration}ms`, 'warning');
        }
      });
    });
    
    await homePage.navigate();
    await testHelper.handleCookieConsent();
  });

  test.afterEach(async () => {
    // Capture browser console errors
    const logs = await testHelper.getBrowserLogs();
    const errors = logs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      Sentry.captureException(new Error(`Browser console errors: ${JSON.stringify(errors)}`));
    }
  });

  test('homepage loads with correct title', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1001' });
    
    const title = await page.title();
    expect(title.toLowerCase()).toContain('fanvue');
    
    // Verify page structure
    const headingCount = await page.locator('h1, h2').count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for meta tags
    const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
    expect(metaDescription).toBeTruthy();
  });

  test('main navigation elements are present and functional', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1002' });
    
    const navigationLinks = await homePage.getNavigationLinks();
    expect(navigationLinks.length).toBeGreaterThan(2);
    
    // Verify each navigation link
    for (const link of navigationLinks) {
      const isVisible = await link.isVisible();
      expect(isVisible).toBeTruthy();
      
      // Check href attribute
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
    
    // Test navigation responsiveness
    const navBar = await homePage.getNavigationBar();
    expect(navBar).toBeTruthy();
    
    // Check sticky navigation behavior
    await page.evaluate(() => window.scrollBy(0, 500));
    const isSticky = await navBar.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.position === 'fixed' || styles.position === 'sticky';
    });
    expect(isSticky).toBeTruthy();
  });

  test('hero section displays correctly with CTA buttons', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1003' });
    
    const heroSection = await homePage.getHeroSection();
    expect(heroSection).toBeTruthy();
    
    // Check for main heading
    const heading = await heroSection.locator('h1').first();
    await expect(heading).toBeVisible();
    
    // Verify CTA buttons
    const ctaButtons = await homePage.getCTAButtons();
    expect(ctaButtons.length).toBeGreaterThan(0);
    
    for (const button of ctaButtons) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      
      // Check button has proper styling
      const backgroundColor = await button.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    }
  });

  test('page loads within performance budget', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1004' });
    
    const metrics = await testHelper.getPerformanceMetrics();
    
    console.log('Performance Metrics:', {
      domContentLoaded: `${metrics.domContentLoaded}ms`,
      loadComplete: `${metrics.loadComplete}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint}ms`,
      largestContentfulPaint: `${metrics.largestContentfulPaint}ms`,
    });
    
    // Performance assertions based on Web Vitals
    expect(metrics.loadComplete).toBeLessThan(10000); // 10 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(2500); // 2.5 seconds
    expect(metrics.largestContentfulPaint).toBeLessThan(4000); // 4 seconds
    
    // Send metrics to Sentry for monitoring
    if (process.env.SENTRY_DSN) {
      Sentry.setMeasurement('page.load.complete', metrics.loadComplete, 'millisecond');
      Sentry.setMeasurement('page.fcp', metrics.firstContentfulPaint, 'millisecond');
      Sentry.setMeasurement('page.lcp', metrics.largestContentfulPaint, 'millisecond');
    }
  });

  test('essential page elements are accessible', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1005' });
    
    // Run accessibility checks
    const accessibilityIssues = await testHelper.checkAccessibility();
    expect(accessibilityIssues).toHaveLength(0);
    
    // Verify semantic HTML structure
    const semanticElements = [
      { selector: 'header', description: 'Header' },
      { selector: 'nav', description: 'Navigation' },
      { selector: 'main', description: 'Main content' },
      { selector: 'footer', description: 'Footer' },
    ];
    
    for (const element of semanticElements) {
      const count = await page.locator(element.selector).count();
      expect(count).toBeGreaterThan(0);
    }
    
    // Check for proper heading hierarchy
    const headingHierarchy = await testHelper.validateHeadingHierarchy();
    expect(headingHierarchy.valid).toBeTruthy();
  });

  test('page handles errors gracefully', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1006' });
    
    // Test 404 handling
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
    
    // Verify error page has proper content
    await expect(page.locator('text=/404|not found/i')).toBeVisible();
    
    // Check for navigation back to home
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('responsive design works correctly', async ({ viewport }) => {
    test.info().annotations.push({ type: 'TestRail', description: 'C1007' });
    
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];
    
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.reload();
      
      // Check if navigation adapts
      if (vp.name === 'mobile') {
        const mobileMenu = await page.locator('[aria-label*="menu"]').isVisible();
        expect(mobileMenu).toBeTruthy();
      } else {
        const desktopNav = await page.locator('nav a').first().isVisible();
        expect(desktopNav).toBeTruthy();
      }
    }
  });
});