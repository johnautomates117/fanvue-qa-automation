import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Selectors
  private readonly selectors = {
    heroSection: 'section:first-of-type, .hero, [data-testid="hero"]',
    mainHeading: 'h1',
    ctaButton: 'a:has-text("Become a Creator"), a:has-text("Sign up"), button:has-text("Get Started")',
    navigationBar: 'nav, header nav, [role="navigation"]',
    navLinks: 'nav a, header a',
    featuresSection: 'section:has-text("features"), section:has-text("Features")',
    testimonialSection: 'section:has-text("testimonial"), section:has-text("creators")',
    footer: 'footer',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to homepage
   */
  async navigate(): Promise<void> {
    await super.navigate('/');
    await this.waitForPageReady();
  }

  /**
   * Get hero section
   */
  async getHeroSection(): Promise<Locator> {
    return this.page.locator(this.selectors.heroSection).first();
  }

  /**
   * Get main heading
   */
  async getMainHeading(): Promise<Locator> {
    const hero = await this.getHeroSection();
    return hero.locator(this.selectors.mainHeading).first();
  }

  /**
   * Get CTA buttons
   */
  async getCTAButtons(): Promise<Locator[]> {
    return await this.page.locator(this.selectors.ctaButton).all();
  }

  /**
   * Get navigation bar
   */
  async getNavigationBar(): Promise<Locator> {
    return this.page.locator(this.selectors.navigationBar).first();
  }

  /**
   * Get navigation links
   */
  async getNavigationLinks(): Promise<Locator[]> {
    const nav = await this.getNavigationBar();
    return await nav.locator('a').all();
  }

  /**
   * Check if hero image is loaded
   */
  async isHeroImageLoaded(): Promise<boolean> {
    const heroSection = await this.getHeroSection();
    const heroImage = heroSection.locator('img').first();
    
    if (await heroImage.count() === 0) {
      return true; // No image to load
    }

    return await heroImage.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalHeight > 0;
    });
  }

  /**
   * Get features section
   */
  async getFeaturesSection(): Promise<Locator | null> {
    const section = this.page.locator(this.selectors.featuresSection).first();
    if (await section.count() > 0) {
      return section;
    }
    
    // Fallback: look for section with feature-related content
    const sections = await this.page.locator('section').all();
    for (const s of sections) {
      const text = await s.textContent();
      if (text && /feature|tool|succeed/i.test(text)) {
        return s;
      }
    }
    
    return null;
  }

  /**
   * Get testimonial section
   */
  async getTestimonialSection(): Promise<Locator | null> {
    const section = this.page.locator(this.selectors.testimonialSection).first();
    if (await section.count() > 0) {
      return section;
    }
    
    // Fallback: look for section with testimonial-related content
    const sections = await this.page.locator('section').all();
    for (const s of sections) {
      const text = await s.textContent();
      if (text && /testimonial|creator|trusted/i.test(text)) {
        return s;
      }
    }
    
    return null;
  }

  /**
   * Get footer
   */
  async getFooter(): Promise<Locator> {
    return this.page.locator(this.selectors.footer).first();
  }

  /**
   * Check if page has loaded successfully
   */
  async isPageLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.heroSection, { timeout: 10000 });
      await this.page.waitForSelector(this.selectors.navigationBar, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get page performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint ? paint.startTime : 0,
        largestContentfulPaint: lcp ? lcp.startTime : 0,
        domInteractive: navigation.domInteractive,
      };
    });
  }

  /**
   * Search for content
   */
  async searchFor(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await this.fillInput(searchInput, query);
      await this.page.keyboard.press('Enter');
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Click main CTA button
   */
  async clickMainCTA(): Promise<void> {
    const ctaButtons = await this.getCTAButtons();
    if (ctaButtons.length > 0) {
      await this.clickWithRetry(ctaButtons[0]);
    }
  }
}