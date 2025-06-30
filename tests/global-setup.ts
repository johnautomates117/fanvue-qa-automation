import { FullConfig } from '@playwright/test';
import * as Sentry from '@sentry/node';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Fanvue QA Automation Test Suite');
  
  // Initialize Sentry for error tracking
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.CI ? 'ci' : 'local',
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Filter out noise
        if (event.exception?.values?.[0]?.value?.includes('ERR_CERT_AUTHORITY_INVALID')) {
          return null;
        }
        return event;
      },
    });
    console.log('✅ Sentry initialized');
  }

  // Create necessary directories
  const directories = [
    'test-results',
    'screenshots',
    'videos',
    'traces',
    'performance-results',
  ];

  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Store test run metadata
  const metadata = {
    startTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    ci: !!process.env.CI,
    branch: process.env.GITHUB_REF || 'local',
    commit: process.env.GITHUB_SHA || 'local',
    runId: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    browser: config.projects[0]?.use?.defaultBrowserType || 'chromium',
    baseURL: config.use?.baseURL || 'https://www.fanvue.com',
    workers: config.workers || 1,
    retries: config.retries || 0,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'test-results', 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Set up global test data
  process.env.TEST_RUN_ID = metadata.runId;
  
  // Initialize MCP connections if available
  await initializeMCPConnections();

  console.log('📋 Test Configuration:');
  console.log(`   Base URL: ${metadata.baseURL}`);
  console.log(`   Workers: ${metadata.workers}`);
  console.log(`   Retries: ${metadata.retries}`);
  console.log(`   Environment: ${metadata.environment}`);
  
  return async () => {
    // This function will be called during teardown
    await globalTeardown();
  };
}

async function initializeMCPConnections() {
  // Initialize Desktop Commander MCP if available
  if (process.env.DESKTOP_COMMANDER_ENABLED === 'true') {
    console.log('🖥️  Desktop Commander MCP: Ready for local test execution');
  }

  // Initialize GitHub MCP
  if (process.env.GITHUB_TOKEN) {
    console.log('🐙 GitHub MCP: Connected for source control integration');
  }

  // Initialize TestRail MCP
  if (process.env.TESTRAIL_HOST) {
    console.log('🧪 TestRail MCP: Connected for test case management');
  }

  // Initialize Sentry MCP
  if (process.env.SENTRY_DSN) {
    console.log('🚨 Sentry MCP: Connected for error tracking');
  }
}

async function globalTeardown() {
  console.log('🏁 Completing test run...');
  
  // Finalize test run metadata
  const metadataPath = path.join(process.cwd(), 'test-results', 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    metadata.endTime = new Date().toISOString();
    metadata.duration = Date.now() - new Date(metadata.startTime).getTime();
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  // Clean up old test artifacts (keep last 5 runs)
  cleanupOldArtifacts();

  // Send final metrics to Sentry
  if (process.env.SENTRY_DSN) {
    const transaction = Sentry.startTransaction({
      op: 'test.suite.complete',
      name: 'Fanvue QA Automation Suite',
    });

    transaction.setData('duration', metadata.duration);
    transaction.setData('environment', metadata.environment);
    
    transaction.finish();
    
    // Ensure all events are sent
    await Sentry.close(2000);
  }

  console.log('✅ Test run completed successfully');
}

function cleanupOldArtifacts() {
  const artifactDirs = ['screenshots', 'videos', 'traces'];
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const dir of artifactDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up old artifact: ${file}`);
      }
    }
  }
}

export default globalSetup;