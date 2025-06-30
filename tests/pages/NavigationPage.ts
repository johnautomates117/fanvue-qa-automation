import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class NavigationPage extends BasePage {
  // Selectors
  private readonly selectors = {
    loginLink: 'a:has-text("Login"), a:has-text("Sign in")',
    signUpButton: 'a:has-text("Sign Up"), a:has-text("Become a Creator"), button:has-text("Sign Up")',
    mobileMenuButton: 'button[aria-label*="menu"], button:has-text("menu"), [data-testid="mobile-menu"]',
    navigationMenu: 'nav, [role="navigation"]',
    footer: 'footer',
    breadcrumb: 'nav[aria-label*="breadcrumb"], .breadcrumb',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Get login link
   */
  async getLoginLink(): Promise<Locator> {
    return this.page.locator(this.selectors.loginLink).first();
  }

  /**
   * Get sign up button
   */
  async getSignUpButton(): Promise<Locator> {
    return this.page.locator(this.selectors.signUpButton).first();
  }

  /**
   * Get mobile menu button
   */
  async getMobileMenuButton(): Promise<Locator> {
    return this.page.locator(this.selectors.mobileMenuButton).first();
  }

  /**
   * Get all navigation links
   */
  async getAllNavigationLinks(): Promise<Locator[]> {
    const nav = this.page.locator(this.selectors.navigationMenu).first();
    return await nav.locator('a:visible').all();
  }

  /**
   * Get footer
   */
  async getFooter(): Promise<Locator> {
    return this.page.locator(this.selectors.footer).first();
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    const loginLink = await this.getLoginLink();
    await this.clickWithRetry(loginLink);
    await this.page.waitForURL(/signin|login/);
  }

  /**
   * Navigate to sign up page
   */
  async navigateToSignUp(): Promise<void> {
    const signUpButton = await this.getSignUpButton();
    await this.clickWithRetry(signUpButton);
    await this.page.waitForURL(/signup|creator|register/);
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu(): Promise<void> {
    const menuButton = await this.getMobileMenuButton();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  /**
   * Close mobile menu
   */
  async closeMobileMenu(): Promise<void> {
    const closeButton = this.page.locator('[aria-label*="close"], button:has-text("close")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  /**
   * Check if navigation is sticky
   */
  async isNavigationSticky(): Promise<boolean> {
    const nav = this.page.locator(this.selectors.navigationMenu).first();
    
    // Scroll down
    await this.page.evaluate(() => window.scrollBy(0, 500));
    await this.page.waitForTimeout(500);
    
    // Check position
    return await nav.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.position === 'fixed' || styles.position === 'sticky';
    });
  }

  /**
   * Get breadcrumb items
   */
  async getBreadcrumbItems(): Promise<string[]> {
    const breadcrumb = this.page.locator(this.selectors.breadcrumb).first();
    if (await breadcrumb.count() === 0) {
      return [];
    }
    
    const items = await breadcrumb.locator('a, span').all();
    const texts: string[] = [];
    
    for (const item of items) {
      const text = await item.textContent();
      if (text) {
        texts.push(text.trim());
      }
    }
    
    return texts;
  }

  /**
   * Navigate using breadcrumb
   */
  async navigateViaBreadcrumb(itemText: string): Promise<void> {
    const breadcrumb = this.page.locator(this.selectors.breadcrumb).first();
    const link = breadcrumb.locator(`a:has-text("${itemText}")`).first();
    
    if (await link.isVisible()) {
      await link.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  /**
   * Get footer links by category
   */
  async getFooterLinks(category?: string): Promise<Locator[]> {
    const footer = await this.getFooter();
    
    if (category) {
      // Look for links in a specific section
      const section = footer.locator(`*:has-text("${category}")`).first();
      if (await section.count() > 0) {
        return await section.locator('a').all();
      }
    }
    
    return await footer.locator('a').all();
  }

  /**
   * Check if user is logged in
   */
  async isUserLoggedIn(): Promise<boolean> {
    // Check for user avatar, profile link, or logout button
    const userIndicators = [
      '[data-testid="user-avatar"]',
      'a:has-text("Profile")',
      'button:has-text("Logout")',
      '.user-menu',
    ];
    
    for (const selector of userIndicators) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 })) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get active navigation item
   */
  async getActiveNavItem(): Promise<Locator | null> {
    const activeSelectors = [
      'nav a[aria-current="page"]',
      'nav a.active',
      'nav a.is-active',
      'nav a[data-active="true"]',
    ];
    
    for (const selector of activeSelectors) {
      const item = this.page.locator(selector).first();
      if (await item.count() > 0) {
        return item;
      }
    }
    
    return null;
  }

  /**
   * Search in navigation
   */
  async searchInNav(query: string): Promise<void> {
    const searchButton = this.page.locator('nav button[aria-label*="search"], nav a[aria-label*="search"]').first();
    
    if (await searchButton.isVisible()) {
      await searchButton.click();
      const searchInput = this.page.locator('input[type="search"]').first();
      await this.fillInput(searchInput, query);
      await this.page.keyboard.press('Enter');
    }
  }
}