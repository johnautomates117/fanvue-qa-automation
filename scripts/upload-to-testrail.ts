import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

interface TestResult {
  title: string;
  status: string;
  duration: number;
  error?: string;
}

interface TestRailConfig {
  host: string;
  username: string;
  apiKey: string;
  projectId: number;
  suiteId?: number;
}

class TestRailUploader {
  private apiClient: AxiosInstance;
  private config: TestRailConfig;

  constructor() {
    this.config = {
      host: process.env.TESTRAIL_HOST || '',
      username: process.env.TESTRAIL_USERNAME || '',
      apiKey: process.env.TESTRAIL_API_KEY || '',
      projectId: parseInt(process.env.TESTRAIL_PROJECT_ID || '0'),
      suiteId: parseInt(process.env.TESTRAIL_SUITE_ID || '0'),
    };

    if (!this.validateConfig()) {
      throw new Error('TestRail configuration is incomplete');
    }

    this.apiClient = axios.create({
      baseURL: `https://${this.config.host}/index.php?/api/v2`,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.config.username,
        password: this.config.apiKey,
      },
    });
  }

  private validateConfig(): boolean {
    return !!(
      this.config.host &&
      this.config.username &&
      this.config.apiKey &&
      this.config.projectId
    );
  }

  async uploadResults(): Promise<void> {
    try {
      // Read test results
      const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
      if (!fs.existsSync(resultsPath)) {
        console.error('No test results found at:', resultsPath);
        return;
      }

      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      // Check if we have an existing run ID
      const runInfoPath = path.join(process.cwd(), 'test-results', 'testrail-run.json');
      let runId: number;
      
      if (fs.existsSync(runInfoPath)) {
        const runInfo = JSON.parse(fs.readFileSync(runInfoPath, 'utf-8'));
        runId = runInfo.runId;
        console.log(`Using existing TestRail run: ${runId}`);
      } else {
        // Create a new run
        runId = await this.createTestRun();
        console.log(`Created new TestRail run: ${runId}`);
      }

      // Process and upload results
      const testRailResults = this.processResults(results);
      await this.submitResults(runId, testRailResults);
      
      // Generate summary report
      await this.generateSummaryReport(runId, results);
      
    } catch (error) {
      console.error('Failed to upload results to TestRail:', error);
      process.exit(1);
    }
  }

  private async createTestRun(): Promise<number> {
    const runData = {
      suite_id: this.config.suiteId,
      name: process.env.TESTRAIL_RUN_NAME || `Automated Run - ${new Date().toISOString()}`,
      description: this.buildRunDescription(),
      include_all: true,
      refs: this.getGitReference(),
    };

    const response = await this.apiClient.post(`/add_run/${this.config.projectId}`, runData);
    return response.data.id;
  }

  private buildRunDescription(): string {
    const lines = [
      'Automated test run from Playwright',
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      `Branch: ${process.env.GITHUB_REF || 'local'}`,
      `Commit: ${process.env.GITHUB_SHA || 'local'}`,
      `Run ID: ${process.env.GITHUB_RUN_ID || 'local'}`,
      `Triggered by: ${process.env.GITHUB_ACTOR || 'local user'}`,
    ];

    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      lines.push(`PR: #${process.env.GITHUB_PR_NUMBER}`);
    }

    return lines.join('\n');
  }

  private getGitReference(): string {
    if (process.env.GITHUB_SHA) {
      return process.env.GITHUB_SHA.substring(0, 7);
    }
    
    try {
      const gitRevision = require('child_process')
        .execSync('git rev-parse --short HEAD')
        .toString()
        .trim();
      return gitRevision;
    } catch {
      return 'unknown';
    }
  }

  private processResults(playwrightResults: any): any[] {
    const testRailResults: any[] = [];
    
    // Navigate through Playwright's JSON structure
    if (playwrightResults.suites) {
      for (const suite of playwrightResults.suites) {
        this.processSuite(suite, testRailResults);
      }
    }

    return testRailResults;
  }

  private processSuite(suite: any, results: any[]): void {
    // Process tests in this suite
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          const caseId = this.extractCaseId(test.title);
          if (caseId) {
            results.push({
              case_id: caseId,
              status_id: this.mapStatus(test.status),
              comment: this.buildComment(test),
              elapsed: this.formatDuration(test.duration),
              version: this.getGitReference(),
            });
          }
        }
      }
    }

    // Process nested suites
    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        this.processSuite(nestedSuite, results);
      }
    }
  }

  private extractCaseId(title: string): number | null {
    // Look for patterns like [C1234] or C1234 in the title
    const match = title.match(/\[?C(\d+)\]?/);
    return match ? parseInt(match[1]) : null;
  }

  private mapStatus(status: string): number {
    const statusMap: { [key: string]: number } = {
      'passed': 1,
      'failed': 5,
      'timedOut': 5,
      'skipped': 2,
      'pending': 3,
    };
    return statusMap[status] || 3;
  }

  private buildComment(test: any): string {
    const lines: string[] = [];
    
    lines.push(`Test: ${test.title}`);
    lines.push(`Status: ${test.status}`);
    lines.push(`Duration: ${this.formatDuration(test.duration)}`);
    
    if (test.annotations && test.annotations.length > 0) {
      lines.push('\nAnnotations:');
      test.annotations.forEach((ann: any) => {
        lines.push(`- ${ann.type}: ${ann.description}`);
      });
    }

    if (test.errors && test.errors.length > 0) {
      lines.push('\nErrors:');
      test.errors.forEach((error: any, index: number) => {
        lines.push(`Error ${index + 1}: ${error.message}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 3);
          lines.push(...stackLines);
        }
      });
    }

    return lines.join('\n');
  }

  private formatDuration(ms: number): string {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private async submitResults(runId: number, results: any[]): Promise<void> {
    if (results.length === 0) {
      console.log('No results to submit to TestRail');
      return;
    }

    // Submit in batches of 100
    const batchSize = 100;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      try {
        await this.apiClient.post(`/add_results_for_cases/${runId}`, {
          results: batch,
        });
        console.log(`Submitted ${batch.length} results to TestRail`);
      } catch (error: any) {
        console.error(`Failed to submit batch ${i / batchSize + 1}:`, error.response?.data || error.message);
      }
    }
  }

  private async generateSummaryReport(runId: number, results: any): Promise<void> {
    const summary = {
      runId,
      runUrl: `https://${this.config.host}/index.php?/runs/view/${runId}`,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    // Calculate summary statistics
    if (results.suites) {
      for (const suite of results.suites) {
        this.calculateSummary(suite, summary);
      }
    }

    // Write summary
    const summaryPath = path.join(process.cwd(), 'test-results', 'testrail-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\nTestRail Upload Summary:');
    console.log(`Run URL: ${summary.runUrl}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Duration: ${this.formatDuration(summary.duration)}`);
  }

  private calculateSummary(suite: any, summary: any): void {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          summary.totalTests++;
          summary.duration += test.duration || 0;
          
          switch (test.status) {
            case 'passed':
              summary.passed++;
              break;
            case 'failed':
            case 'timedOut':
              summary.failed++;
              break;
            case 'skipped':
              summary.skipped++;
              break;
          }
        }
      }
    }

    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        this.calculateSummary(nestedSuite, summary);
      }
    }
  }
}

// Run the uploader
if (require.main === module) {
  const uploader = new TestRailUploader();
  uploader.uploadResults().catch((error) => {
    console.error('Upload failed:', error);
    process.exit(1);
  });
}

export default TestRailUploader;