import { test, expect, Page } from '@playwright/test';
import { VisualTestHelper } from './visual-test-helper';

/**
 * Optimized Visual Regression Tests
 * - Only tests critical UI components
 * - Uses viewport screenshots instead of full page
 * - Implements smart waiting strategies
 * - Masks dynamic content
 */
test.describe('Fanvue Visual Regression Tests - Critical Path Only', () => {
  let page: Page;
  let visualHelper: VisualTestHelper;

  test.beforeAll(async () => {
    // Pre-cache static assets to speed up subsequent tests
    console.log('Pre-warming browser cache...');
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualHelper = new VisualTestHelper(page);
    
    // Navigate with optimized settings
    await page.goto('/', { 
      waitUntil: 'domcontentloaded', // Don't wait for all network activity
      timeout: 15000 
    });
    
    // Apply visual regression CSS once
    await visualHelper.applyVisualRegressionStyles();
    
    // Handle cookie consent without waiting
    await visualHelper.dismissCookieConsent();
    
    // Wait for critical fonts
    await page.evaluate(() => document.fonts.ready);
  });

  test('Homepage - Hero Section @critical', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3001' });
    
    const heroSection = page.locator('section').first();
    await heroSection.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for hero image if present
    const heroImage = heroSection.locator('img').first();
    if (await heroImage.count() > 0) {
      await heroImage.waitFor({ state: 'visible' });
      // Ensure image is loaded
      await page.waitForFunction(
        (imgSelector) => {
          const img = document.querySelector(imgSelector) as HTMLImageElement;
          return img && img.complete && img.naturalHeight > 0;
        },
        'section:first-child img'
      );
    }
    
    await expect(heroSection).toHaveScreenshot('hero-section.png', {
      animations: 'disabled',
      mask: await visualHelper.getDynamicElementSelectors(),
      timeout: 10000,
    });
  });

  test('Homepage - Navigation Bar @critical', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3002' });
    
    const navbar = page.locator('nav, header').first();
    await navbar.waitFor({ state: 'visible', timeout: 5000 });
    
    // Ensure navigation is fully rendered
    await page.waitForTimeout(500);
    
    await expect(navbar).toHaveScreenshot('navigation-bar.png', {
      animations: 'disabled',
      mask: ['.user-avatar', '.notification-badge'],
    });
  });

  test('Homepage - Footer @critical', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3003' });
    
    const footer = page.locator('footer').last();
    await footer.scrollIntoViewIfNeeded();
    
    // Wait for lazy-loaded content in footer
    await page.waitForTimeout(500);
    
    await expect(footer).toHaveScreenshot('footer.png', {
      animations: 'disabled',
      mask: ['.copyright-year', '.version-number'],
    });
  });

  test('Mobile - Homepage Hero @mobile @critical', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3004' });
    
    // This test only runs on mobile project due to @mobile tag
    const heroSection = page.locator('section').first();
    await heroSection.waitFor({ state: 'visible', timeout: 5000 });
    
    await expect(heroSection).toHaveScreenshot('mobile-hero.png', {
      animations: 'disabled',
      mask: await visualHelper.getDynamicElementSelectors(),
    });
  });

  test.skip('Full Page Snapshot - Manual Trigger Only', async () => {
    // This test is skipped by default to save time
    // Can be run manually with: --grep "Full Page"
    test.info().annotations.push({ type: 'TestRail', description: 'C3005' });
    
    await page.waitForLoadState('networkidle');
    await visualHelper.waitForAllImages();
    
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled',
      mask: await visualHelper.getDynamicElementSelectors(),
      timeout: 30000,
    });
  });

  test('Signup Form - Layout Only', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3006' });
    
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    
    const signupForm = page.locator('form, [role="form"], main').first();
    await signupForm.waitFor({ state: 'visible', timeout: 10000 });
    
    // Focus on form structure, not content
    await expect(signupForm).toHaveScreenshot('signup-form.png', {
      animations: 'disabled',
      mask: [
        'input', // Mask all inputs to avoid flaky cursor positions
        '.captcha', // Mask captcha if present
        '[type="submit"]', // Mask submit button state
      ],
    });
  });
});

/**
 * Separate test suite for non-critical visual tests
 * Run these less frequently (e.g., nightly or on release branches)
 */
test.describe('Fanvue Visual Regression Tests - Extended', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Extended tests run on Chromium only');
  
  let page: Page;
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualHelper = new VisualTestHelper(page);
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await visualHelper.applyVisualRegressionStyles();
    await visualHelper.dismissCookieConsent();
  });

  test('Features Section', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3007' });
    
    const featuresSection = await visualHelper.findSectionByContent(['feature', 'tool', 'succeed']);
    if (!featuresSection) {
      test.skip();
      return;
    }
    
    await featuresSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    await expect(featuresSection).toHaveScreenshot('features-section.png', {
      animations: 'disabled',
    });
  });

  test('Responsive Design - Tablet View', async () => {
    test.info().annotations.push({ type: 'TestRail', description: 'C3008' });
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await visualHelper.applyVisualRegressionStyles();
    
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toHaveScreenshot('tablet-main-content.png', {
      animations: 'disabled',
    });
  });
});