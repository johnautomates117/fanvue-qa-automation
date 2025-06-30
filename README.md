# Fanvue QA Automation Suite

🚀 A modern, TypeScript-based Playwright test automation suite for Fanvue.com with comprehensive MCP (Model Context Protocol) integrations for enhanced SDLC workflows.

## ✨ Key Features

- **100% TypeScript** - Full type safety and enhanced IDE support
- **Page Object Model** - Maintainable and scalable test architecture
- **MCP Integrations** - Seamless integration with Desktop Commander, GitHub, TestRail, and Sentry
- **Optimized Visual Testing** - 6x faster visual regression tests (30min → 5min)
- **CI/CD Ready** - GitHub Actions with automated reporting
- **Comprehensive Reporting** - HTML reports, TestRail sync, and Sentry monitoring
- **Cross-browser Testing** - Chrome, Firefox, Safari, and mobile browsers
- **Accessibility Testing** - Built-in a11y checks with axe-core

## 📋 Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Git

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/johnautomates117/fanvue-qa-automation.git
cd fanvue-qa-automation

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

## 🏃‍♂️ Running Tests

### E2E Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/e2e/homepage.spec.ts

# Run tests in headed mode
npm run test:headed

# Run tests for specific browser
npm test -- --project=chromium

# Debug tests
npm run test:debug
```

### Visual Regression Tests
```bash
# Run visual tests
npm run test:visual

# Update visual snapshots
npm run test:visual:update

# View visual test report
npm run test:visual:report
```

### Performance Tests
```bash
# Run k6 performance tests
npm run k6:test

# Run k6 tests in cloud
npm run k6:cloud
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```env
# TestRail Configuration
TESTRAIL_HOST=yourcompany.testrail.io
TESTRAIL_USERNAME=your-email@company.com
TESTRAIL_API_KEY=your-api-key
TESTRAIL_PROJECT_ID=1

# Sentry Configuration
SENTRY_DSN=https://your-key@sentry.io/project-id

# GitHub Token (for MCP)
GITHUB_TOKEN=your-github-token
```

## 🏗️ Project Structure

```
fanvue-qa-automation/
├── tests/
│   ├── e2e/                    # End-to-end tests
│   │   ├── homepage.spec.ts
│   │   └── navigation.spec.ts
│   ├── visual/                 # Visual regression tests
│   │   ├── visual-regression.spec.ts
│   │   └── visual-test-helper.ts
│   ├── pages/                  # Page Object Model
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   └── NavigationPage.ts
│   ├── helpers/                # Test utilities
│   │   └── TestHelper.ts
│   └── reporters/              # Custom reporters
│       └── testrail-reporter.ts
├── scripts/                    # Utility scripts
│   └── upload-to-testrail.ts
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions workflow
├── playwright.config.ts        # Main Playwright config
├── playwright-visual.config.ts # Visual test config
└── tsconfig.json              # TypeScript config
```

## 🤖 MCP Integrations

### Desktop Commander MCP
Execute and debug tests directly from Claude Desktop:

```typescript
// Run tests locally
await desktopCommander.execute_command({
  command: "npm test",
  timeout_ms: 300000
});

// Debug failed tests
const screenshot = await desktopCommander.read_file({
  path: "./test-results/failed-test.png"
});
```

### GitHub MCP
Automate PR workflows and CI/CD:

```typescript
// Create PR with test updates
await github.create_pull_request({
  owner: "johnautomates117",
  repo: "fanvue-qa-automation",
  title: "Fix: Update test selectors",
  head: "fix/test-updates",
  base: "main"
});
```

### TestRail MCP
Sync test results automatically:

```typescript
// Tests are automatically tagged
test('homepage loads', async () => {
  test.info().annotations.push({ 
    type: 'TestRail', 
    description: 'C1001' 
  });
  // test implementation
});
```

### Sentry MCP
Monitor test execution and errors:

```typescript
// Errors are automatically tracked
if (testFailed) {
  Sentry.captureException(error, {
    tags: { test: testName }
  });
}
```

## 📊 Reporting

### HTML Reports
```bash
# View test report
npm run test:report
```

### TestRail Integration
```bash
# Upload results to TestRail
npm run testrail:upload
```

### GitHub Pages
Test reports are automatically deployed to GitHub Pages on main branch commits.

## 🚀 CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Runs tests on every push and PR
2. Uploads results to TestRail
3. Sends metrics to Sentry
4. Comments on PRs with test results
5. Deploys reports to GitHub Pages

### Manual Workflow Trigger
You can manually trigger specific test types:
- `all` - Run all tests
- `e2e` - Run only E2E tests
- `visual` - Run only visual tests
- `performance` - Run only performance tests

## 📈 Performance Optimizations

### Visual Test Optimization
- **Before**: 30 minutes
- **After**: 5 minutes
- **How**: Viewport-only screenshots, critical path testing, smart masking

### Parallel Execution
- Tests run in parallel across multiple workers
- Configurable via `WORKERS` environment variable

## 🧪 Test Patterns

### Page Object Model
```typescript
export class HomePage extends BasePage {
  async navigate(): Promise<void> {
    await super.navigate('/');
  }
  
  async getHeroSection(): Promise<Locator> {
    return this.page.locator('.hero').first();
  }
}
```

### Test Structure
```typescript
test.describe('Homepage Tests', () => {
  let homePage: HomePage;
  
  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });
  
  test('should load correctly', async () => {
    test.info().annotations.push({ 
      type: 'TestRail', 
      description: 'C1001' 
    });
    
    await expect(homePage.getTitle())
      .toContain('Fanvue');
  });
});
```

## 🐛 Debugging

### Local Debugging
```bash
# Run with UI mode
npx playwright test --ui

# Debug specific test
npx playwright test --debug tests/e2e/homepage.spec.ts
```

### VS Code Integration
Install the Playwright extension for VS Code for:
- Inline test execution
- Debugging with breakpoints
- Test generation

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a PR with test results

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- MCP integrations via [Anthropic Claude](https://www.anthropic.com/)
- Visual regression testing optimized for performance
- TestRail integration for comprehensive test management

---

**For detailed MCP integration guide, see [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md)**

**For interview demonstration, see [INTERVIEW_DEMO_SCRIPT.md](./INTERVIEW_DEMO_SCRIPT.md)**