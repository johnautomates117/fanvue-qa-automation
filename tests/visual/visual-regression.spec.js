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
      const cookieButton = page.locator('button:has-text("Accept"), button:has-text("OK"), button:has-text("Got it")').first();
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
    await heroSection.waitFor({ state: 'visible' });
    await expect(heroSection).toHaveScreenshot('hero-section.png');
  });

  test('Homepage - Navigation Bar', async ({ page }) => {
    const navbar = page.locator('nav, header').first();
    await navbar.waitFor({ state: 'visible' });
    await expect(navbar).toHaveScreenshot('navigation-bar.png');
  });

  test('Homepage - Features Section', async ({ page }) => {
    // Use multiple possible selectors
    const featuresSection = await page.locator('section:has-text("features"), section:has-text("Features"), section:has-text("All the features")').first();
    
    if (await featuresSection.count() === 0) {
      // Fallback: look for a section with feature-related content
      const altSection = page.locator('section').filter({ hasText: /feature|succeed|tool/i }).first();
      if (await altSection.count() > 0) {
        await altSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        await expect(altSection).toHaveScreenshot('features-section.png');
        return;
      }
    }
    
    await featuresSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await expect(featuresSection).toHaveScreenshot('features-section.png');
  });

  test('Homepage - Creator Testimonials', async ({ page }) => {
    // Use multiple possible selectors
    const testimonials = await page.locator('section:has-text("testimonial"), section:has-text("creator"), section:has-text("Trusted by")').first();
    
    if (await testimonials.count() === 0) {
      // Fallback: look for a section with testimonial-related content
      const altSection = page.locator('section').filter({ hasText: /creator|testimonial|trusted/i }).first();
      if (await altSection.count() > 0) {
        await altSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        await expect(altSection).toHaveScreenshot('creator-testimonials.png');
        return;
      }
    }
    
    await testimonials.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await expect(testimonials).toHaveScreenshot('creator-testimonials.png');
  });

  test('Homepage - Footer', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await expect(footer).toHaveScreenshot('footer.png');
  });

  test('Signup Page - Form Layout', async ({ page }) => {
    await page.goto('https://www.fanvue.com/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Better selector for signup form - look for form or container with email input
    const signupForm = await page.locator('form:has(input[type="email"]), div:has(input[type="email"])').first();
    
    if (await signupForm.count() > 0) {
      await expect(signupForm).toHaveScreenshot('signup-form.png');
    } else {
      // Fallback: capture the main content area
      const mainContent = page.locator('main, [role="main"], .main-content').first();
      await expect(mainContent).toHaveScreenshot('signup-form.png');
    }
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
    // More flexible selector
    const faqSection = await page.locator('section:has-text("FAQ"), section:has-text("frequently asked"), section:has-text("Questions")').first();
    
    if (await faqSection.count() === 0) {
      // Skip test if FAQ section not found
      console.log('FAQ section not found, skipping test');
      return;
    }
    
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    // Capture closed state
    await expect(faqSection).toHaveScreenshot('faq-closed.png');
    
    // Try to find and click first FAQ item
    const faqItems = await page.locator('[role="button"], [data-accordion], details, .faq-item').all();
    
    if (faqItems.length > 0) {
      await faqItems[0].click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Capture open state
      await expect(faqSection).toHaveScreenshot('faq-open.png');
    }
  });
});
