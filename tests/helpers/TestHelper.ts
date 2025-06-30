import { Page, TestInfo } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';
import * as Sentry from '@sentry/node';

export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  domInteractive: number;
}

export interface BrowserLog {
  type: string;
  text: string;
  location?: string;
}

export class TestHelper {
  private logs: BrowserLog[] = [];

  constructor(private page: Page) {
    this.setupLogCollection();
  }

  /**
   * Set up browser console log collection
   */
  private setupLogCollection(): void {
    this.page.on('console', (msg) => {
      this.logs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url,
      });
    });

    this.page.on('pageerror', (error) => {
      this.logs.push({
        type: 'error',
        text: error.message,
      });
    });
  }

  /**
   * Get collected browser logs
   */
  getBrowserLogs(): BrowserLog[] {
    return this.logs;
  }

  /**
   * Clear collected logs
   */
  clearBrowserLogs(): void {
    this.logs = [];
  }

  /**
   * Handle cookie consent
   */
  async handleCookieConsent(): Promise<void> {
    const cookieSelectors = [
      'button:has-text("Accept")',
      'button:has-text("OK")',
      'button:has-text("Got it")',
      'button:has-text("Agree")',
      'a:has-text("OK")',
      '[data-testid="cookie-accept"]',
      '.cookie-consent button',
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          await this.page.waitForTimeout(500);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop() as PerformanceEntry;

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
   * Check accessibility
   */
  async checkAccessibility(options?: any): Promise<any[]> {
    await injectAxe(this.page);
    
    const defaultOptions = {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
      ...options,
    };

    try {
      await checkA11y(this.page, undefined, defaultOptions);
      return [];
    } catch (error: any) {
      // Parse accessibility violations from error
      const violations = error.message.match(/(\d+) accessibility violation/);
      if (violations) {
        return error.violations || [];
      }
      return [];
    }
  }

  /**
   * Validate heading hierarchy
   */
  async validateHeadingHierarchy(): Promise<{ valid: boolean; issues: string[] }> {
    const result = await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const issues: string[] = [];
      let lastLevel = 0;

      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        
        if (index === 0 && level !== 1) {
          issues.push(`First heading should be H1, found H${level}`);
        }
        
        if (level - lastLevel > 1) {
          issues.push(`Heading level jumped from H${lastLevel} to H${level}`);
        }
        
        lastLevel = level;
      });

      // Check for multiple H1s
      const h1Count = headings.filter(h => h.tagName === 'H1').length;
      if (h1Count > 1) {
        issues.push(`Found ${h1Count} H1 elements, should have only one`);
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    });

    return result;
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(timeout: number = 30000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Some sites have persistent connections, so timeout is acceptable
    }
  }

  /**
   * Check for broken images
   */
  async checkForBrokenImages(): Promise<string[]> {
    const brokenImages = await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .filter(img => !img.complete || img.naturalHeight === 0)
        .map(img => img.src || img.getAttribute('data-src') || 'unknown');
    });

    return brokenImages;
  }

  /**
   * Get all external links
   */
  async getExternalLinks(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const currentHost = window.location.host;
      
      return links
        .map(link => link.getAttribute('href') || '')
        .filter(href => {
          try {
            const url = new URL(href, window.location.origin);
            return url.host !== currentHost;
          } catch {
            return false;
          }
        });
    });
  }

  /**
   * Check response status for resources
   */
  async checkResourceStatuses(): Promise<{ url: string; status: number }[]> {
    const failedResources: { url: string; status: number }[] = [];

    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResources.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Wait for page to load
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    return failedResources;
  }

  /**
   * Measure element render time
   */
  async measureElementRenderTime(selector: string): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForSelector(selector, { state: 'visible' });
    return Date.now() - startTime;
  }

  /**
   * Get page weight (total bytes downloaded)
   */
  async getPageWeight(): Promise<number> {
    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.reduce((total, resource) => total + (resource.transferSize || 0), 0);
    });
  }

  /**
   * Check for memory leaks
   */
  async checkMemoryUsage(): Promise<{ heapUsed: number; heapTotal: number }> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
        };
      }
      return { heapUsed: 0, heapTotal: 0 };
    });
  }

  /**
   * Send test results to Sentry
   */
  sendToSentry(testInfo: TestInfo, error?: Error): void {
    if (!process.env.SENTRY_DSN) return;

    const transaction = Sentry.startTransaction({
      op: 'test',
      name: testInfo.title,
    });

    Sentry.configureScope((scope) => {
      scope.setTag('test.status', testInfo.status || 'unknown');
      scope.setTag('test.file', testInfo.file);
      scope.setTag('test.project', testInfo.project.name);
      scope.setContext('test', {
        duration: testInfo.duration,
        retry: testInfo.retry,
        annotations: testInfo.annotations,
      });
    });

    if (error) {
      Sentry.captureException(error);
    }

    transaction.finish();
  }

  /**
   * Wait for animations to complete
   */
  async waitForAnimations(): Promise<void> {
    await this.page.evaluate(() => {
      return Promise.all(
        Array.from(document.querySelectorAll('*')).map((element) => {
          const animations = element.getAnimations();
          return Promise.all(animations.map(animation => animation.finished));
        })
      );
    });
  }

  /**
   * Mock geolocation
   */
  async mockGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.page.context().setGeolocation({ latitude, longitude });
    await this.page.context().grantPermissions(['geolocation']);
  }

  /**
   * Block specific resources
   */
  async blockResources(types: string[]): Promise<void> {
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (types.includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }
}