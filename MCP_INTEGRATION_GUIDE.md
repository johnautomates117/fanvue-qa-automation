# MCP Integration Guide for Fanvue QA Automation Suite

This document provides comprehensive guidance on integrating Model Context Protocol (MCP) tools with the Fanvue QA Automation test suite for enhanced SDLC integration.

## Table of Contents
1. [Overview](#overview)
2. [Claude Desktop with Desktop Commander MCP](#claude-desktop-with-desktop-commander-mcp)
3. [GitHub MCP Integration](#github-mcp-integration)
4. [TestRail MCP Integration](#testrail-mcp-integration)
5. [Sentry MCP Integration](#sentry-mcp-integration)
6. [Complete Integration Example](#complete-integration-example)

## Overview

The Fanvue QA Automation Suite is designed to seamlessly integrate with MCP tools to provide:
- **Local test execution and debugging** via Desktop Commander
- **Source control and CI/CD automation** via GitHub MCP
- **Test case management** via TestRail MCP
- **Error tracking and monitoring** via Sentry MCP

## Claude Desktop with Desktop Commander MCP

Desktop Commander MCP enables local test execution, debugging, and file management directly from Claude Desktop.

### Setup

1. **Enable Desktop Commander in Claude Desktop**
   ```bash
   # In Claude Desktop settings, enable Desktop Commander MCP
   ```

2. **Configure Environment**
   ```bash
   export DESKTOP_COMMANDER_ENABLED=true
   export DC_ALLOWED_DIRECTORIES="/path/to/fanvue-qa-automation"
   ```

### Usage Examples

#### Running Tests Locally
```typescript
// Use Desktop Commander to execute tests
await desktopCommander.execute_command({
  command: "npm test -- --project=chromium",
  timeout_ms: 300000
});

// Watch test execution in real-time
const output = await desktopCommander.read_output({ pid: processId });
```

#### Debugging Failed Tests
```typescript
// Read test results
const results = await desktopCommander.read_file({
  path: "/path/to/test-results/results.json"
});

// View failure screenshots
const screenshot = await desktopCommander.read_file({
  path: "/path/to/test-results/screenshot-failed.png",
  isUrl: false
});

// Edit test files for fixes
await desktopCommander.edit_block({
  file_path: "/path/to/tests/e2e/homepage.spec.ts",
  old_string: "await page.click('.wrong-selector')",
  new_string: "await page.click('.correct-selector')"
});
```

#### Performance Analysis
```typescript
// Analyze test execution times
const performanceData = await desktopCommander.search_code({
  path: "/path/to/test-results",
  pattern: "duration.*[0-9]+ms",
  filePattern: "*.json"
});
```

## GitHub MCP Integration

GitHub MCP provides seamless integration with source control and GitHub Actions.

### Setup

1. **Configure GitHub Token**
   ```bash
   export GITHUB_TOKEN="your-github-token"
   export GITHUB_REPOSITORY="johnautomates117/fanvue-qa-automation"
   ```

2. **Enable GitHub Actions**
   - The repository includes `.github/workflows/ci.yml` for automated testing

### Usage Examples

#### Automated PR Testing
```typescript
// Create a new branch for test updates
await github.create_branch({
  owner: "johnautomates117",
  repo: "fanvue-qa-automation",
  branch: "fix/homepage-tests",
  from_branch: "main"
});

// Push test updates
await github.push_files({
  owner: "johnautomates117",
  repo: "fanvue-qa-automation",
  branch: "fix/homepage-tests",
  files: [
    {
      path: "tests/e2e/homepage.spec.ts",
      content: updatedTestContent
    }
  ],
  message: "Fix homepage test selectors"
});

// Create PR with test results
await github.create_pull_request({
  owner: "johnautomates117",
  repo: "fanvue-qa-automation",
  title: "Fix: Update homepage test selectors",
  head: "fix/homepage-tests",
  base: "main",
  body: `## Changes
  - Updated selectors for homepage tests
  - Fixed flaky navigation tests
  
  ## Test Results
  - ✅ All tests passing
  - 🚀 Performance improved by 15%`
});
```

#### Test Result Reporting in PRs
```yaml
# Automatically comments on PRs with test results
- name: Comment PR with test results
  uses: actions/github-script@v7
  with:
    script: |
      const results = // ... load test results
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        body: `## Test Results
        ✅ ${results.passed} passed
        ❌ ${results.failed} failed
        ⏱️ Duration: ${results.duration}`
      });
```

## TestRail MCP Integration

TestRail MCP enables automatic synchronization of test results with test case management.

### Setup

1. **Configure TestRail Credentials**
   ```bash
   export TESTRAIL_HOST="yourcompany.testrail.io"
   export TESTRAIL_USERNAME="your-email@company.com"
   export TESTRAIL_API_KEY="your-api-key"
   export TESTRAIL_PROJECT_ID="1"
   ```

2. **Annotate Tests with Case IDs**
   ```typescript
   test('homepage loads correctly', async () => {
     test.info().annotations.push({ type: 'TestRail', description: 'C1001' });
     // test implementation
   });
   ```

### Usage Examples

#### Automatic Test Run Creation
```typescript
// TestRail reporter automatically creates runs
const reporter = new TestRailReporter({
  host: process.env.TESTRAIL_HOST,
  username: process.env.TESTRAIL_USERNAME,
  apiKey: process.env.TESTRAIL_API_KEY,
  projectId: 1,
  runName: `Automated Run - ${new Date().toISOString()}`
});
```

#### Manual Result Upload
```bash
# Upload results after test execution
npm run testrail:upload
```

#### Test Case Synchronization
```typescript
// Sync test cases from TestRail
const testCases = await testrailMCP.getCases({
  projectId: 1,
  suiteId: 2
});

// Generate test stubs
testCases.forEach(testCase => {
  generateTestStub(testCase);
});
```

## Sentry MCP Integration

Sentry MCP provides real-time error tracking and performance monitoring.

### Setup

1. **Configure Sentry DSN**
   ```bash
   export SENTRY_DSN="https://your-key@sentry.io/project-id"
   export SENTRY_ENVIRONMENT="qa"
   ```

2. **Initialize in Tests**
   ```typescript
   // Automatically initialized in global-setup.ts
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.CI ? 'ci' : 'local'
   });
   ```

### Usage Examples

#### Error Tracking
```typescript
// Automatic error capture in tests
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    // Errors automatically sent to Sentry
    const logs = await page.evaluate(() => window.console.logs);
    Sentry.captureException(new Error(`Test failed: ${testInfo.title}`), {
      tags: {
        test_file: testInfo.file,
        browser: testInfo.project.name
      },
      extra: {
        console_logs: logs
      }
    });
  }
});
```

#### Performance Monitoring
```typescript
// Track test performance
const transaction = Sentry.startTransaction({
  op: 'test',
  name: testInfo.title
});

// Measure specific operations
const span = transaction.startChild({
  op: 'page.load',
  description: 'Homepage load time'
});

await page.goto('/');
span.finish();

transaction.finish();
```

#### Log Aggregation
```typescript
// View test logs in Sentry
Sentry.addBreadcrumb({
  message: 'Navigating to homepage',
  category: 'navigation',
  level: 'info'
});
```

## Complete Integration Example

Here's a complete example showing all MCP tools working together:

```typescript
// 1. Desktop Commander: Run tests locally
const testRun = await desktopCommander.execute_command({
  command: "npm test -- --project=chromium",
  timeout_ms: 300000
});

// 2. GitHub MCP: Create PR with fixes
if (testRun.exitCode !== 0) {
  // Fix issues
  await desktopCommander.edit_block({
    file_path: "tests/e2e/failing-test.spec.ts",
    old_string: "broken selector",
    new_string: "fixed selector"
  });
  
  // Create PR
  await github.create_pull_request({
    owner: "johnautomates117",
    repo: "fanvue-qa-automation",
    title: "Fix: Failing tests",
    head: "fix/test-failures",
    base: "main"
  });
}

// 3. TestRail MCP: Results automatically uploaded
// The TestRail reporter handles this during test execution

// 4. Sentry MCP: Monitor for errors
// Errors and performance metrics automatically sent during tests
```

## CI/CD Pipeline Integration

The GitHub Actions workflow (`ci.yml`) automatically:
1. Runs tests on every push and PR
2. Uploads results to TestRail
3. Sends metrics to Sentry
4. Comments on PRs with results
5. Deploys test reports to GitHub Pages

### Triggering Different Test Types
```bash
# Manual trigger via GitHub Actions
# Select test type: all, e2e, visual, or performance
```

## Best Practices

1. **Always tag tests with TestRail case IDs** for traceability
2. **Use Sentry breadcrumbs** to track test flow
3. **Leverage Desktop Commander** for rapid local debugging
4. **Automate everything** through GitHub Actions
5. **Monitor test flakiness** through Sentry performance tracking

## Troubleshooting

### Desktop Commander Issues
```bash
# Check permissions
export DC_ALLOWED_DIRECTORIES="$(pwd)"

# Enable verbose logging
export DC_LOG_LEVEL="debug"
```

### TestRail Connection Issues
```bash
# Verify credentials
curl -u "$TESTRAIL_USERNAME:$TESTRAIL_API_KEY" \
  "https://$TESTRAIL_HOST/index.php?/api/v2/get_projects"
```

### Sentry Not Receiving Data
```typescript
// Check DSN configuration
console.log('Sentry DSN:', process.env.SENTRY_DSN);

// Force flush events
await Sentry.close(2000);
```

## Conclusion

This MCP integration provides a complete SDLC solution for the Fanvue QA Automation suite, enabling:
- Rapid local development and debugging
- Automated CI/CD with comprehensive reporting
- Centralized test case management
- Proactive error monitoring and alerting

For your interview demo, focus on showcasing how these integrations work together to create a modern, efficient QA workflow.