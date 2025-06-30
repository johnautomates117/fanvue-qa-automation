import { Page, Locator } from '@playwright/test';

export class VisualTestHelper {
  constructor(private page: Page) {}

  /**
   * Apply CSS to hide dynamic content and disable animations
   */
  async applyVisualRegressionStyles(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        /* Hide dynamic content for consistent screenshots */
        .timestamp, .live-count, .user-count, .view-count,
        .notification-badge, .unread-count, .online-indicator,
        [data-testid="dynamic-content"] {
          visibility: hidden !important;
        }
        
        /* Disable all animations and transitions */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          animation-fill-mode: forwards !important;
        }
        
        /* Stabilize hover states */
        *:hover {
          transition: none !important;
        }
        
        /* Hide video elements to avoid frame differences */
        video {
          visibility: hidden !important;
        }
        
        /* Ensure consistent font rendering */
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        
        /* Hide loading skeletons */
        .skeleton, .shimmer, .loading {
          display: none !important;
        }
        
        /* Normalize input placeholders */
        input::placeholder,
        textarea::placeholder {
          color: #999 !important;
          opacity: 1 !important;
        }
        
        /* Hide cursors and selections */
        * {
          caret-color: transparent !important;
        }
        ::selection {
          background-color: transparent !important;
        }
      `,
    });
  }

  /**
   * Get selectors for dynamic elements that should be masked
   */
  async getDynamicElementSelectors(): Promise<string[]> {
    return [
      '.timestamp',
      '.date-display',
      '.relative-time',
      '.user-count',
      '.view-count',
      '.like-count',
      '.analytics-value',
      '[data-dynamic="true"]',
      '.live-indicator',
      '.carousel-indicator',
      '.ad-container',
      'iframe',
    ];
  }

  /**
   * Dismiss cookie consent banner if present
   */
  async dismissCookieConsent(): Promise<void> {
    try {
      const cookieSelectors = [
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'button:has-text("Got it")',
        'button:has-text("Agree")',
        'a:has-text("OK")',
        '[data-testid="cookie-accept"]',
      ];
      
      for (const selector of cookieSelectors) {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          // Wait for cookie banner to disappear
          await this.page.waitForTimeout(500);
          break;
        }
      }
    } catch {
      // Cookie banner might not appear
    }
  }

  /**
   * Wait for all images on the page to load
   */
  async waitForAllImages(): Promise<void> {
    await this.page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete && img.naturalHeight > 0);
    }, { timeout: 30000 });
  }

  /**
   * Wait for fonts to load
   */
  async waitForFonts(): Promise<void> {
    await this.page.evaluate(() => document.fonts.ready);
  }

  /**
   * Find section by content keywords
   */
  async findSectionByContent(keywords: string[]): Promise<Locator | null> {
    for (const keyword of keywords) {
      const section = this.page.locator('section').filter({ 
        hasText: new RegExp(keyword, 'i') 
      }).first();
      
      if (await section.count() > 0) {
        return section;
      }
    }
    
    return null;
  }

  /**
   * Stabilize dynamic content before screenshot
   */
  async stabilizeContent(): Promise<void> {
    // Pause videos
    await this.page.evaluate(() => {
      document.querySelectorAll('video').forEach(video => {
        video.pause();
        video.currentTime = 0;
      });
    });
    
    // Stop any CSS animations
    await this.page.evaluate(() => {
      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.animationName !== 'none') {
          (el as HTMLElement).style.animationPlayState = 'paused';
        }
      });
    });
    
    // Clear any intervals or timeouts that might cause changes
    await this.page.evaluate(() => {
      // Store original functions
      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;
      
      // Override to prevent new timers
      window.setInterval = () => 0;
      window.setTimeout = () => 0;
      
      // Clear existing timers (with reasonable limits)
      for (let i = 1; i < 1000; i++) {
        clearInterval(i);
        clearTimeout(i);
      }
      
      // Restore if needed later
      (window as any).__originalSetInterval = originalSetInterval;
      (window as any).__originalSetTimeout = originalSetTimeout;
    });
  }

  /**
   * Check if element is in viewport
   */
  async isInViewport(locator: Locator): Promise<boolean> {
    return await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    });
  }

  /**
   * Smart scroll to element with stabilization
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    // Wait for scroll to complete and any lazy-loaded content
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
      // Ignore timeout, some sites have persistent connections
    });
  }
}