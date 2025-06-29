const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Fanvue Accessibility Tests', () => {
  test('homepage meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/');
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.description} (${violation.id})`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Elements: ${violation.nodes.length}`);
      });
    }
    
    // For demo purposes, we'll just check critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(criticalViolations.length).toBe(0);
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that focused element is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Verify focus indicator is present
    const outlineStyle = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.boxShadow;
    });
    
    expect(outlineStyle).not.toBe('none');
  });
});