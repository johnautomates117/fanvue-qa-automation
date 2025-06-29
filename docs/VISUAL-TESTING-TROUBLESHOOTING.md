# Visual Regression Testing Troubleshooting Guide

## Common Issues and Solutions

### 1. **"No baselines found" on first PR**
**Issue**: The workflow tries to download baseline artifacts that don't exist yet.
**Solution**: This is expected behavior. The workflow will create initial baselines on the first run.

### 2. **Tests failing due to missing elements**
**Issue**: Selectors can't find expected page elements.
**Solutions**:
- Run tests locally first: `npm run test:visual`
- Check if website structure has changed
- Use the improved selectors in the updated test file
- Add `--headed` flag to see browser: `npx playwright test --config=playwright-visual.config.js --headed`

### 3. **PR comment not posting**
**Issue**: GitHub Actions doesn't have permission to comment on PRs.
**Solution**: Already fixed by adding proper permissions in workflow file.

### 4. **Visual differences on CI vs local**
**Issue**: Screenshots differ between environments.
**Solutions**:
- Ensure same browser versions: `npx playwright install`
- Use headless mode locally to match CI
- Check font rendering differences
- Increase threshold in `playwright-visual.config.js` if needed

## Pre-Demo Checklist

1. **Test locally first**:
   ```bash
   chmod +x scripts/test-visual-local.sh
   ./scripts/test-visual-local.sh
   ```

2. **If tests fail locally**:
   - Review the visual report: `npm run test:visual:report`
   - Update baselines if changes are intentional: `npm run test:visual:update`

3. **Push fixes to your PR**:
   ```bash
   git add .
   git commit -m "Fix visual regression tests"
   git push origin feature/visual-regression-testing
   ```

4. **Monitor CI/CD**:
   - Check Actions tab on GitHub
   - Look for the visual-regression-tests job
   - Download artifacts if needed for debugging

## Quick Fixes

### Force baseline creation:
```bash
npm run test:visual:update
git add tests/visual/__screenshots__/
git commit -m "Update visual baselines"
git push
```

### Skip flaky tests temporarily:
Add `.skip` to problematic tests:
```javascript
test.skip('Flaky test name', async ({ page }) => {
  // test code
});
```

### Increase timeouts:
```javascript
test.setTimeout(120000); // 2 minutes
```

## Demo Preparation

1. **Create baselines on main branch first** (if not done):
   - Merge a PR that creates initial baselines
   - This ensures future PRs have something to compare against

2. **For the demo PR**:
   - Make small, intentional UI changes
   - The workflow should detect and report these changes
   - Show how to review visual diffs in artifacts

3. **Backup plan**:
   - Have screenshots of successful runs ready
   - Prepare to explain the visual regression testing concept
   - Show the local testing script as a development tool
