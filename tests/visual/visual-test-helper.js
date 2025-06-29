// Visual Testing Utilities
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

class VisualTestHelper {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.outputDir = options.outputDir || 'visual-diffs';
    this.baselineDir = options.baselineDir || 'visual-baselines';
  }

  async compareScreenshots(actualPath, baselinePath, diffPath) {
    // Ensure directories exist
    this.ensureDirectoryExists(this.outputDir);
    
    // Read images
    const actual = PNG.sync.read(fs.readFileSync(actualPath));
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    
    // Create diff image
    const { width, height } = actual;
    const diff = new PNG({ width, height });
    
    // Compare images
    const numDiffPixels = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      width,
      height,
      { threshold: this.threshold }
    );
    
    // Save diff image if there are differences
    if (numDiffPixels > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }
    
    return {
      match: numDiffPixels === 0,
      diffPixels: numDiffPixels,
      diffPercentage: (numDiffPixels / (width * height)) * 100
    };
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateDiffReport(results) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .test { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
    .pass { background-color: #e8f5e9; }
    .fail { background-color: #ffebee; }
    .images { display: flex; gap: 10px; margin-top: 10px; }
    .image-container { flex: 1; }
    .image-container img { max-width: 100%; border: 1px solid #ccc; }
    .stats { margin: 10px 0; font-size: 14px; }
    h1 { color: #333; }
    h2 { color: #666; }
    .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Visual Regression Test Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: ${results.length}</p>
    <p>Passed: ${results.filter(r => r.match).length}</p>
    <p>Failed: ${results.filter(r => !r.match).length}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  ${results.map(result => `
    <div class="test ${result.match ? 'pass' : 'fail'}">
      <h3>${result.name}</h3>
      <div class="stats">
        <strong>Status:</strong> ${result.match ? 'PASSED' : 'FAILED'}<br>
        ${!result.match ? `
          <strong>Diff Pixels:</strong> ${result.diffPixels}<br>
          <strong>Diff Percentage:</strong> ${result.diffPercentage.toFixed(2)}%
        ` : ''}
      </div>
      ${!result.match ? `
        <div class="images">
          <div class="image-container">
            <h4>Baseline</h4>
            <img src="${result.baselineUrl}" alt="Baseline">
          </div>
          <div class="image-container">
            <h4>Actual</h4>
            <img src="${result.actualUrl}" alt="Actual">
          </div>
          <div class="image-container">
            <h4>Diff</h4>
            <img src="${result.diffUrl}" alt="Diff">
          </div>
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>
    `;
    
    fs.writeFileSync(path.join(this.outputDir, 'report.html'), html);
  }
}

module.exports = { VisualTestHelper };