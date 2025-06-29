// Visual Regression Tests for Fanvue.com
const { test, expect } = require('@playwright/test');

test.describe('Fanvue Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for fonts and images to load
    await page.goto('https://www.fanvue.com', { waitUntil: 'networkidle' });
    
    // Hide dynamic content that changes frequently
    await page.addStyleTag({
      content: `
        /* Hide dynamic content for consistent screenshots */
        .user-count, .timestamp, .live-indicator { visibility: hidden !important; }
        /* Disable animations */
        *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
      `
    });
    
    // Accept cookies if present
    try {
      const cookieButton = page.locator('button:has-text("OK")').first();
      await cookieButton.click({ timeout: 5000 });
    } catch {
      // Cookie banner may not appear
    }
  });

  test('Homepage - Full Page Visual', async ({ page }) => {
    // Wait for hero image to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Ensure all assets are rendered
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Homepage - Hero Section', async ({ page }) => {
    const heroSection = page.locator('section').first();
    await expect(heroSection).toHaveScreenshot('hero-section.png');
  });

  test('Homepage - Navigation Bar', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navigation-bar.png');
  });

  test('Homepage - Features Section', async ({ page }) => {
    // Use more reliable selector
    const featuresSection = page.locator('text="All the features you need to Succeed"').locator('..');
    await featuresSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait for scroll
    await expect(featuresSection).toHaveScreenshot('features-section.png');
  });

  test('Homepage - Creator Testimonials', async ({ page }) => {
    // Use more reliable selector
    const testimonials = page.locator('text="Trusted by the world\'s biggest creators"').locator('..');
    await testimonials.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait for scroll
    await expect(testimonials).toHaveScreenshot('creator-testimonials.png');
  });

  test('Homepage - Footer', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait for scroll
    await expect(footer).toHaveScreenshot('footer.png');
  });

  test('Signup Page - Form Layout', async ({ page }) => {
    await page.goto('https://www.fanvue.com/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Better selector for signup form
    const signupForm = page.locator('div:has(input[type="email"])').first();
    await expect(signupForm).toHaveScreenshot('signup-form.png');
  });

  test('Mobile - Homepage Responsive', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://www.fanvue.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot(`mobile-homepage-${browserName}.png`, {
      fullPage: true,
    });
  });

  test('Tablet - Homepage Responsive', async ({ page, browserName }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('https://www.fanvue.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot(`tablet-homepage-${browserName}.png`, {
      fullPage: true,
    });
  });

  test('FAQ Section - Interaction States', async ({ page }) => {
    // More reliable selector
    const faqSection = page.locator('text="Frequently asked questions"').locator('..');
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait for scroll
    
    // Capture closed state
    await expect(faqSection).toHaveScreenshot('faq-closed.png');
    
    // Open first FAQ item - better selector
    const firstFaq = page.locator('text="What is fanvue?"');
    if (await firstFaq.isVisible()) {
      await firstFaq.click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Capture open state
      await expect(faqSection).toHaveScreenshot('faq-open.png');
    }
  });
});