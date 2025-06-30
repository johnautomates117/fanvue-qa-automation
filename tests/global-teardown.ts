import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as Sentry from '@sentry/node';

async function globalTeardown(config: FullConfig) {
  console.log('\n📊 Generating test summary...');

  try {
    // Read test results
    const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
    const metadataPath = path.join(process.cwd(), 'test-results', 'metadata.json');
    
    let results: any = {};
    let metadata: any = {};

    if (fs.existsSync(resultsPath)) {
      results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    }

    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    // Generate summary
    const summary = generateTestSummary(results, metadata);
    
    // Write summary to file
    fs.writeFileSync(
      path.join(process.cwd(), 'test-results', 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Display summary in console
    displaySummary(summary);

    // Send summary to monitoring services
    await sendSummaryToServices(summary);

    // Generate HTML report
    generateHTMLReport(summary);

  } catch (error) {
    console.error('Failed to generate test summary:', error);
  }

  console.log('\n✅ Test suite teardown completed');
}

function generateTestSummary(results: any, metadata: any): any {
  const summary = {
    metadata,
    stats: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: 0,
    },
    failedTests: [] as any[],
    slowestTests: [] as any[],
    browsers: {} as any,
    timestamp: new Date().toISOString(),
  };

  // Process test results
  if (results.suites) {
    processSuites(results.suites, summary);
  }

  // Calculate pass rate
  summary.stats.passRate = summary.stats.total > 0 
    ? Math.round((summary.stats.passed / summary.stats.total) * 100) 
    : 0;

  // Sort slowest tests
  summary.slowestTests.sort((a, b) => b.duration - a.duration);
  summary.slowestTests = summary.slowestTests.slice(0, 10);

  return summary;
}

function processSuites(suites: any[], summary: any): void {
  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        processSpec(spec, summary);
      }
    }
    
    if (suite.suites) {
      processSuites(suite.suites, summary);
    }
  }
}

function processSpec(spec: any, summary: any): void {
  for (const test of spec.tests || []) {
    summary.stats.total++;
    summary.stats.duration += test.duration || 0;

    // Track by browser
    const browserName = test.projectName || 'unknown';
    if (!summary.browsers[browserName]) {
      summary.browsers[browserName] = {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
      };
    }
    
    summary.browsers[browserName].total++;
    summary.browsers[browserName].duration += test.duration || 0;

    // Track test status
    switch (test.status) {
      case 'passed':
        summary.stats.passed++;
        summary.browsers[browserName].passed++;
        break;
      case 'failed':
      case 'timedOut':
        summary.stats.failed++;
        summary.browsers[browserName].failed++;
        summary.failedTests.push({
          title: test.title,
          file: spec.file,
          browser: browserName,
          error: test.errors?.[0]?.message || 'Unknown error',
          duration: test.duration,
        });
        break;
      case 'skipped':
        summary.stats.skipped++;
        break;
    }

    // Track flaky tests
    if (test.retry > 0 && test.status === 'passed') {
      summary.stats.flaky++;
    }

    // Track slow tests
    if (test.duration > 10000) { // Tests taking more than 10 seconds
      summary.slowestTests.push({
        title: test.title,
        file: spec.file,
        duration: test.duration,
        browser: browserName,
      });
    }
  }
}

function displaySummary(summary: any): void {
  console.log('\n' + '='.repeat(80));
  console.log('                        TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n📈 Overall Statistics:');
  console.log(`   Total Tests: ${summary.stats.total}`);
  console.log(`   ✅ Passed: ${summary.stats.passed} (${summary.stats.passRate}%)`);
  console.log(`   ❌ Failed: ${summary.stats.failed}`);
  console.log(`   ⏭️  Skipped: ${summary.stats.skipped}`);
  console.log(`   🔄 Flaky: ${summary.stats.flaky}`);
  console.log(`   ⏱️  Duration: ${formatDuration(summary.stats.duration)}`);

  if (Object.keys(summary.browsers).length > 0) {
    console.log('\n🌐 Results by Browser:');
    for (const [browser, stats] of Object.entries(summary.browsers as any)) {
      console.log(`   ${browser}:`);
      console.log(`     - Total: ${stats.total}`);
      console.log(`     - Passed: ${stats.passed}`);
      console.log(`     - Failed: ${stats.failed}`);
      console.log(`     - Duration: ${formatDuration(stats.duration)}`);
    }
  }

  if (summary.failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    summary.failedTests.slice(0, 5).forEach((test: any, index: number) => {
      console.log(`   ${index + 1}. ${test.title}`);
      console.log(`      File: ${test.file}`);
      console.log(`      Browser: ${test.browser}`);
      console.log(`      Error: ${test.error.split('\n')[0]}`);
    });
    
    if (summary.failedTests.length > 5) {
      console.log(`   ... and ${summary.failedTests.length - 5} more`);
    }
  }

  if (summary.slowestTests.length > 0) {
    console.log('\n🐌 Slowest Tests:');
    summary.slowestTests.slice(0, 5).forEach((test: any, index: number) => {
      console.log(`   ${index + 1}. ${test.title} (${formatDuration(test.duration)})`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function sendSummaryToServices(summary: any): Promise<void> {
  // Send to Sentry
  if (process.env.SENTRY_DSN) {
    const transaction = Sentry.startTransaction({
      op: 'test.summary',
      name: 'Test Execution Summary',
    });

    Sentry.setContext('test_summary', {
      total: summary.stats.total,
      passed: summary.stats.passed,
      failed: summary.stats.failed,
      passRate: summary.stats.passRate,
      duration: summary.stats.duration,
    });

    if (summary.stats.failed > 0) {
      Sentry.captureMessage(`Test suite completed with ${summary.stats.failed} failures`, 'warning');
    }

    transaction.finish();
  }

  // Send to other monitoring services
  // Add integrations for DataDog, New Relic, etc. as needed
}

function generateHTMLReport(summary: any): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fanvue QA Test Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #2d3748;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .metric-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .metric-label {
            color: #666;
            font-size: 0.9rem;
        }
        .passed { color: #48bb78; }
        .failed { color: #f56565; }
        .skipped { color: #ed8936; }
        .section {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 1rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f7fafc;
            font-weight: 600;
        }
        .error-message {
            color: #e53e3e;
            font-size: 0.875rem;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Fanvue QA Automation Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Environment: ${summary.metadata.environment} | Branch: ${summary.metadata.branch}</p>
    </div>

    <div class="summary-grid">
        <div class="metric-card">
            <div class="metric-label">Total Tests</div>
            <div class="metric-value">${summary.stats.total}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Passed</div>
            <div class="metric-value passed">${summary.stats.passed}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Failed</div>
            <div class="metric-value failed">${summary.stats.failed}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Pass Rate</div>
            <div class="metric-value">${summary.stats.passRate}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Duration</div>
            <div class="metric-value">${formatDuration(summary.stats.duration)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Flaky Tests</div>
            <div class="metric-value">${summary.stats.flaky}</div>
        </div>
    </div>

    ${summary.failedTests.length > 0 ? `
    <div class="section">
        <h2>Failed Tests</h2>
        <table>
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Browser</th>
                    <th>Duration</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${summary.failedTests.map((test: any) => `
                <tr>
                    <td>${test.title}</td>
                    <td>${test.browser}</td>
                    <td>${formatDuration(test.duration)}</td>
                    <td class="error-message">${escapeHtml(test.error)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h2>Browser Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Browser</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.browsers).map(([browser, stats]: [string, any]) => `
                <tr>
                    <td>${browser}</td>
                    <td>${stats.total}</td>
                    <td class="passed">${stats.passed}</td>
                    <td class="failed">${stats.failed}</td>
                    <td>${formatDuration(stats.duration)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(
    path.join(process.cwd(), 'test-results', 'summary.html'),
    html
  );
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .split('\n')[0]; // Only show first line
}

export default globalTeardown;