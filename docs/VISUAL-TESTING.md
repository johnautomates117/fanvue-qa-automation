# Visual Regression Testing Guide

## Overview
Visual regression testing automatically detects unintended UI changes by comparing screenshots of your application over time. This ensures that CSS changes, layout modifications, or content updates don't break the visual appearance of your site.

## How It Works

### 1. Baseline Creation
When you first run visual tests, Playwright captures screenshots of various page elements and saves them as "baseline" images.

### 2. Comparison Process
On subsequent test runs, new screenshots are captured and compared pixel-by-pixel against the baselines.

### 3. Difference Detection
If differences exceed the configured threshold (0.2% by default), the test fails and generates:
- A diff image highlighting changes
- A detailed report showing what changed
- Percentage of pixels that differ

## Running Visual Tests

### Local Development

```bash
# Run visual regression tests
npm run test:visual

# Update baseline screenshots (after intentional changes)
npm run test:visual:update

# View visual test report
npm run test:visual:report
```

### CI/CD Pipeline
Visual tests run automatically on:
- Every push to main/develop branches
- All pull requests
- Scheduled runs every 6 hours

## Test Coverage

Our visual regression suite covers:

### Desktop Views (1920x1080)
- Homepage full page
- Navigation bar
- Hero section
- Features section
- Creator testimonials
- Footer
- Signup form

### Mobile Views (375x667)
- Homepage responsive layout
- Navigation menu
- Form layouts

### Tablet Views (768x1024)
- Homepage responsive layout
- Content reflow

### Interactive States
- FAQ accordion (open/closed)
- Button hover states
- Form focus states

## Configuration

### Threshold Settings
Located in `playwright-visual.config.js`:
```javascript
toMatchSnapshot: { 
  threshold: 0.2,        // 20% pixel difference tolerance
  maxDiffPixels: 100,    // Maximum different pixels allowed
  animations: 'disabled' // Disable animations for consistency
}
```

### Excluding Dynamic Content
Dynamic content (timestamps, user counts) is hidden via CSS injection:
```css
.user-count, .timestamp, .live-indicator { 
  visibility: hidden !important; 
}
```

## Best Practices

### 1. Consistent Environment
- Always run tests in headless mode for CI/CD
- Use fixed viewport sizes
- Disable animations and transitions

### 2. Handling Intentional Changes
When UI changes are intentional:
```bash
# Review changes locally first
npm run test:visual

# Update baselines if changes are correct
npm run test:visual:update

# Commit new baselines
git add tests/visual/__screenshots__/
git commit -m "Update visual baselines after UI redesign"
```

### 3. Debugging Failures
When tests fail:
1. Check the visual regression report
2. Review diff images to understand changes
3. Determine if changes are intentional or bugs
4. Update baselines or fix the issue accordingly

### 4. Cross-Browser Testing
Visual tests run on multiple browsers to catch rendering differences:
- Chromium (Chrome, Edge)
- Firefox
- WebKit (Safari)

## Troubleshooting

### Common Issues

#### 1. Flaky Tests
**Problem**: Tests pass/fail inconsistently
**Solution**: 
- Increase wait times for dynamic content
- Add explicit waits for images/fonts
- Disable animations globally

#### 2. Font Rendering Differences
**Problem**: Fonts render differently across environments
**Solution**:
- Use web fonts with explicit loading
- Wait for font load events
- Consider increasing threshold for text-heavy areas

#### 3. Anti-aliasing Differences
**Problem**: Edges appear different on different machines
**Solution**:
- Increase threshold slightly (0.2-0.3)
- Focus on layout changes rather than pixel-perfect matching

## Integration with Other Tools

### Percy.io (Future Enhancement)
For more advanced visual testing:
```javascript
// Example Percy integration
const percySnapshot = require('@percy/playwright');

test('Homepage Percy snapshot', async ({ page }) => {
  await page.goto('https://www.fanvue.com');
  await percySnapshot(page, 'Homepage');
});
```

### Slack Notifications
Configure webhooks in CI/CD to notify on visual test failures:
```yaml
- name: Notify Slack on visual regression
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text":"Visual regression detected on Fanvue.com"}'
```

## Reporting

### HTML Report
Generated automatically after test runs:
- Shows all test results
- Includes baseline, actual, and diff images
- Calculates difference percentages
- Accessible at `visual-regression-report/index.html`

### JSON Report
Machine-readable format for integrations:
- Located at `visual-test-results.json`
- Contains detailed metrics for each test
- Can be parsed for custom dashboards

## Maintenance

### Regular Tasks
1. **Weekly**: Review and update baselines for legitimate changes
2. **Monthly**: Clean up old baseline images
3. **Quarterly**: Review threshold settings and adjust if needed

### Storage Optimization
- Baselines are stored in `tests/visual/__screenshots__/`
- Use Git LFS for large screenshot files
- Archive old baselines when major redesigns occur

## Benefits

1. **Catch Visual Bugs Early**: Detect CSS and layout issues before production
2. **Prevent Regression**: Ensure new changes don't break existing UI
3. **Cross-Browser Confidence**: Verify consistent rendering across browsers
4. **Documentation**: Screenshots serve as visual documentation
5. **Design System Compliance**: Ensure UI follows design guidelines

## Next Steps

1. **Expand Coverage**: Add more interactive state tests
2. **Component Testing**: Test individual UI components
3. **A/B Testing**: Compare different versions visually
4. **Performance**: Optimize screenshot comparison speed
5. **AI Enhancement**: Use AI to ignore insignificant changes