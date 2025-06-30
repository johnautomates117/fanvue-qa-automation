import { Reporter, TestCase, TestResult, FullResult, Suite } from '@playwright/test/reporter';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TestRailResult {
  case_id: number;
  status_id: number;
  comment?: string;
  elapsed?: string;
  defects?: string;
  version?: string;
}

interface TestRailOptions {
  host: string;
  username: string;
  apiKey: string;
  projectId: number;
  suiteId?: number;
  runName?: string;
}

export default class TestRailReporter implements Reporter {
  private options: TestRailOptions;
  private results: TestRailResult[] = [];
  private runId?: number;
  private apiClient: axios.AxiosInstance;

  constructor(options: TestRailOptions) {
    this.options = {
      host: process.env.TESTRAIL_HOST || options.host,
      username: process.env.TESTRAIL_USERNAME || options.username,
      apiKey: process.env.TESTRAIL_API_KEY || options.apiKey,
      projectId: parseInt(process.env.TESTRAIL_PROJECT_ID || '') || options.projectId,
      suiteId: parseInt(process.env.TESTRAIL_SUITE_ID || '') || options.suiteId,
      runName: process.env.TESTRAIL_RUN_NAME || options.runName || `Automated Test Run - ${new Date().toISOString()}`,
    };

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: `https://${this.options.host}/index.php?/api/v2`,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.options.username,
        password: this.options.apiKey,
      },
    });
  }

  async onBegin(): Promise<void> {
    if (!this.isConfigured()) {
      console.log('TestRail reporter not configured. Skipping...');
      return;
    }

    try {
      // Create a new test run
      const runData = {
        suite_id: this.options.suiteId,
        name: this.options.runName,
        description: `Automated test run from Playwright\nBranch: ${process.env.GITHUB_REF || 'local'}\nCommit: ${process.env.GITHUB_SHA || 'local'}`,
        include_all: true,
        refs: process.env.GITHUB_SHA?.substring(0, 7),
      };

      const response = await this.apiClient.post(`/add_run/${this.options.projectId}`, runData);
      this.runId = response.data.id;
      console.log(`Created TestRail run: ${this.runId}`);
    } catch (error) {
      console.error('Failed to create TestRail run:', error);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.isConfigured() || !this.runId) return;

    // Extract TestRail case ID from test annotations
    const caseId = this.extractCaseId(test);
    if (!caseId) return;

    // Map Playwright status to TestRail status
    const status = this.mapStatus(result.status);
    
    // Build result object
    const testRailResult: TestRailResult = {
      case_id: caseId,
      status_id: status,
      elapsed: this.formatDuration(result.duration),
      version: process.env.GITHUB_SHA?.substring(0, 7) || 'local',
    };

    // Add error details if test failed
    if (result.status === 'failed' || result.status === 'timedOut') {
      const errorDetails = this.formatError(result);
      testRailResult.comment = errorDetails;
      testRailResult.defects = result.errors.map(e => e.message).join(', ').substring(0, 250);
    }

    // Add attachments info
    if (result.attachments.length > 0) {
      const attachmentInfo = result.attachments
        .map(a => `${a.name}: ${a.path}`)
        .join('\n');
      testRailResult.comment = (testRailResult.comment || '') + `\n\nAttachments:\n${attachmentInfo}`;
    }

    this.results.push(testRailResult);
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.isConfigured() || !this.runId || this.results.length === 0) return;

    try {
      // Upload results in batches
      const batchSize = 100;
      for (let i = 0; i < this.results.length; i += batchSize) {
        const batch = this.results.slice(i, i + batchSize);
        await this.apiClient.post(`/add_results_for_cases/${this.runId}`, {
          results: batch,
        });
      }

      console.log(`Updated ${this.results.length} test results in TestRail run ${this.runId}`);

      // Close the run if all tests passed
      if (result.status === 'passed') {
        await this.apiClient.post(`/close_run/${this.runId}`, {});
        console.log(`Closed TestRail run ${this.runId}`);
      }

      // Save run ID for future reference
      this.saveRunId();
    } catch (error) {
      console.error('Failed to update TestRail results:', error);
    }
  }

  private isConfigured(): boolean {
    return !!(
      this.options.host &&
      this.options.username &&
      this.options.apiKey &&
      this.options.projectId
    );
  }

  private extractCaseId(test: TestCase): number | null {
    // Look for TestRail case ID in test annotations
    const annotation = test.annotations.find(a => a.type === 'TestRail');
    if (annotation && annotation.description) {
      const match = annotation.description.match(/C(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Fallback: look for case ID in test title
    const titleMatch = test.title.match(/\[C(\d+)\]/);
    if (titleMatch) {
      return parseInt(titleMatch[1]);
    }

    return null;
  }

  private mapStatus(status: TestResult['status']): number {
    // TestRail status IDs:
    // 1 - Passed
    // 2 - Blocked
    // 3 - Untested
    // 4 - Retest
    // 5 - Failed
    switch (status) {
      case 'passed':
        return 1;
      case 'failed':
      case 'timedOut':
        return 5;
      case 'skipped':
        return 2;
      default:
        return 3;
    }
  }

  private formatDuration(duration: number): string {
    const seconds = Math.round(duration / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private formatError(result: TestResult): string {
    const lines: string[] = [];
    
    lines.push(`Test Status: ${result.status}`);
    lines.push(`Duration: ${this.formatDuration(result.duration)}`);
    
    if (result.retry > 0) {
      lines.push(`Retry: ${result.retry}`);
    }

    lines.push('\n--- Error Details ---');
    
    result.errors.forEach((error, index) => {
      lines.push(`\nError ${index + 1}:`);
      lines.push(error.message || 'No error message');
      
      if (error.stack) {
        // Clean up stack trace
        const stackLines = error.stack
          .split('\n')
          .filter(line => !line.includes('node_modules'))
          .slice(0, 5);
        lines.push('Stack trace:');
        lines.push(...stackLines);
      }
    });

    // Add test steps if available
    if (result.steps.length > 0) {
      lines.push('\n--- Test Steps ---');
      result.steps.forEach((step, index) => {
        const stepStatus = step.error ? '❌' : '✅';
        lines.push(`${stepStatus} Step ${index + 1}: ${step.title} (${step.duration}ms)`);
        if (step.error) {
          lines.push(`   Error: ${step.error.message}`);
        }
      });
    }

    // Add browser info
    lines.push('\n--- Environment ---');
    lines.push(`Browser: ${process.env.BROWSER_NAME || 'unknown'}`);
    lines.push(`OS: ${process.platform}`);
    lines.push(`Node: ${process.version}`);

    return lines.join('\n');
  }

  private saveRunId(): void {
    // Save run ID to file for other tools to reference
    const outputDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const runInfo = {
      runId: this.runId,
      runName: this.options.runName,
      timestamp: new Date().toISOString(),
      url: `https://${this.options.host}/index.php?/runs/view/${this.runId}`,
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'testrail-run.json'),
      JSON.stringify(runInfo, null, 2)
    );
  }
}

// Export a factory function for Playwright to use
module.exports = TestRailReporter;