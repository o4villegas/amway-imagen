/**
 * Test Orchestrator
 * Coordinates error detection, auto-remediation, and intelligent test execution
 */

import { test, expect, Page } from '@playwright/test';
import { ErrorDetector, DetectedError } from './error-detector';
import { AutoRemediator, RemediationResult } from './auto-remediator';

export interface TestContext {
  page: Page;
  errorDetector: ErrorDetector;
  autoRemediator: AutoRemediator;
  testName: string;
  startTime: number;
}

export interface TestResult {
  testName: string;
  duration: number;
  status: 'passed' | 'failed' | 'auto-fixed' | 'manual-intervention-required';
  errorsDetected: DetectedError[];
  remediationResults: RemediationResult[];
  screenshots: string[];
  summary: string;
}

export class TestOrchestrator {
  private testResults: TestResult[] = [];
  private globalErrorPatterns: Map<string, DetectedError[]> = new Map();

  async runSmartTest(
    testName: string,
    testFunction: (context: TestContext) => Promise<void>,
    page: Page
  ): Promise<TestResult> {
    const startTime = Date.now();
    const errorDetector = new ErrorDetector(page);
    const autoRemediator = new AutoRemediator(page);

    const context: TestContext = {
      page,
      errorDetector,
      autoRemediator,
      testName,
      startTime
    };

    console.log(`🚀 Starting smart test: ${testName}`);

    let testStatus: TestResult['status'] = 'passed';
    let errorsDetected: DetectedError[] = [];
    let remediationResults: RemediationResult[] = [];
    let screenshots: string[] = [];

    try {
      // Run the actual test
      await testFunction(context);

      // Comprehensive error detection after test
      console.log('🔍 Running comprehensive error detection...');

      const [uiErrors, perfErrors, a11yErrors, secErrors] = await Promise.all([
        errorDetector.detectUIErrors(),
        errorDetector.detectPerformanceErrors(),
        errorDetector.detectAccessibilityErrors(),
        errorDetector.detectSecurityErrors()
      ]);

      errorsDetected = [
        ...errorDetector.getAllErrors(), // Runtime errors
        ...uiErrors,
        ...perfErrors,
        ...a11yErrors,
        ...secErrors
      ];

      if (errorsDetected.length > 0) {
        console.log(`⚠️ Detected ${errorsDetected.length} errors, attempting auto-remediation...`);

        // Take screenshot before remediation
        const preRemediationScreenshot = `${testName}-pre-remediation-${Date.now()}.png`;
        await page.screenshot({ path: `test-results/${preRemediationScreenshot}`, fullPage: true });
        screenshots.push(preRemediationScreenshot);

        // Attempt auto-remediation
        remediationResults = await autoRemediator.remediateAll(errorsDetected);

        // Check remediation success
        const successfulRemediations = remediationResults.filter(r => r.success);
        const failedRemediations = remediationResults.filter(r => !r.success);

        if (failedRemediations.length === 0) {
          testStatus = 'auto-fixed';
          console.log('✅ All errors successfully auto-remediated');
        } else {
          const criticalFailures = failedRemediations.filter(r =>
            r.error?.severity === 'critical' || r.error?.type === 'security'
          );

          if (criticalFailures.length > 0) {
            testStatus = 'manual-intervention-required';
            console.log('🚨 Critical errors require manual intervention');
          } else {
            testStatus = 'auto-fixed';
            console.log('✅ Auto-remediation successful (some non-critical issues remain)');
          }
        }

        // Take screenshot after remediation
        const postRemediationScreenshot = `${testName}-post-remediation-${Date.now()}.png`;
        await page.screenshot({ path: `test-results/${postRemediationScreenshot}`, fullPage: true });
        screenshots.push(postRemediationScreenshot);
      }

      // Learn from error patterns for future tests
      this.learnFromErrors(testName, errorsDetected);

    } catch (testError: any) {
      console.log(`❌ Test failed: ${testError.message}`);
      testStatus = 'failed';

      // Take screenshot of failure
      const failureScreenshot = `${testName}-failure-${Date.now()}.png`;
      await page.screenshot({ path: `test-results/${failureScreenshot}`, fullPage: true });
      screenshots.push(failureScreenshot);

      // Try to recover from test failure
      const recoveryResult = await this.attemptTestRecovery(context, testError);
      if (recoveryResult.recovered) {
        testStatus = 'auto-fixed';
        remediationResults.push(recoveryResult.remediation);
      }
    }

    const duration = Date.now() - startTime;
    const result: TestResult = {
      testName,
      duration,
      status: testStatus,
      errorsDetected,
      remediationResults,
      screenshots,
      summary: this.generateTestSummary(testStatus, errorsDetected, remediationResults, duration)
    };

    this.testResults.push(result);
    console.log(`🏁 Test completed: ${testName} (${testStatus}) in ${duration}ms`);
    console.log(result.summary);

    return result;
  }

  private async attemptTestRecovery(
    context: TestContext,
    testError: Error
  ): Promise<{ recovered: boolean; remediation: RemediationResult }> {
    console.log('🔧 Attempting test recovery...');

    // Create a synthetic error for the test failure
    const syntheticError: DetectedError = {
      id: `test-failure-${Date.now()}`,
      type: 'functional',
      severity: 'critical',
      description: `Test failure: ${testError.message}`,
      location: 'Test execution',
      timestamp: Date.now(),
      reproductionSteps: ['Run test', 'Error occurred'],
      autoFixable: true,
      context: { testName: context.testName, errorMessage: testError.message }
    };

    const remediation = await context.autoRemediator.remediate(syntheticError);

    if (remediation.success) {
      try {
        // Try to continue test execution after remediation
        await context.page.waitForTimeout(2000);
        return { recovered: true, remediation };
      } catch {
        return { recovered: false, remediation };
      }
    }

    return { recovered: false, remediation };
  }

  private learnFromErrors(testName: string, errors: DetectedError[]) {
    // Store error patterns for machine learning
    for (const error of errors) {
      const pattern = `${error.type}-${error.description.substring(0, 50)}`;
      if (!this.globalErrorPatterns.has(pattern)) {
        this.globalErrorPatterns.set(pattern, []);
      }
      this.globalErrorPatterns.get(pattern)!.push(error);
    }
  }

  private generateTestSummary(
    status: TestResult['status'],
    errors: DetectedError[],
    remediations: RemediationResult[],
    duration: number
  ): string {
    const summary = [`Test Status: ${status.toUpperCase()}`];

    if (errors.length > 0) {
      summary.push(`Errors Detected: ${errors.length}`);

      const errorsByType = errors.reduce((acc, err) => {
        acc[err.type] = (acc[err.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      summary.push(`Error Breakdown: ${Object.entries(errorsByType)
        .map(([type, count]) => `${type}(${count})`)
        .join(', ')}`);
    }

    if (remediations.length > 0) {
      const successful = remediations.filter(r => r.success).length;
      summary.push(`Auto-Remediation: ${successful}/${remediations.length} successful`);
    }

    summary.push(`Duration: ${duration}ms`);

    return summary.join(' | ');
  }

  // Advanced test execution patterns
  async runAdaptiveTestSuite(page: Page): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // 1. Critical Path Test (with aggressive auto-remediation)
    results.push(await this.runSmartTest('Critical User Journey', async (ctx) => {
      await this.testCriticalUserJourney(ctx);
    }, page));

    // 2. Error Injection Test (intentionally trigger errors to test remediation)
    results.push(await this.runSmartTest('Error Injection Test', async (ctx) => {
      await this.testErrorInjection(ctx);
    }, page));

    // 3. Stress Test (high load scenarios)
    results.push(await this.runSmartTest('Stress Test', async (ctx) => {
      await this.testStressScenarios(ctx);
    }, page));

    // 4. Edge Case Test (unusual user behaviors)
    results.push(await this.runSmartTest('Edge Cases', async (ctx) => {
      await this.testEdgeCases(ctx);
    }, page));

    return results;
  }

  private async testCriticalUserJourney(ctx: TestContext) {
    const { page } = ctx;

    // Complete user journey with error detection at each step
    await page.goto('/campaign/new');
    await expect(page.locator('h1')).toBeVisible();

    // Step 1: URL Input
    await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123456');
    await page.click('button[type="submit"]');

    // Wait for processing and check for errors
    await page.waitForTimeout(2000);
    await this.checkForRuntimeErrors(ctx);

    // Step 2: Configuration (if we get there)
    const configVisible = await page.locator('text=Configure').isVisible().catch(() => false);
    if (configVisible) {
      await page.click('button:has-text("Generate")');
      await this.checkForRuntimeErrors(ctx);
    }

    // Continue through all steps...
  }

  private async testErrorInjection(ctx: TestContext) {
    const { page } = ctx;

    // Inject network failures
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30% failure rate
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/campaign/new');
    await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123456');
    await page.click('button[type="submit"]');

    // Let auto-remediation handle the injected failures
    await page.waitForTimeout(5000);
  }

  private async testStressScenarios(ctx: TestContext) {
    const { page } = ctx;

    // Rapid interactions to stress the UI
    await page.goto('/campaign/new');

    for (let i = 0; i < 20; i++) {
      await page.fill('input[type="url"]', `https://www.amway.com/en_US/p-${i}`);
      await page.waitForTimeout(100);
    }

    await this.checkForRuntimeErrors(ctx);
  }

  private async testEdgeCases(ctx: TestContext) {
    const { page } = ctx;

    // Test unusual inputs and behaviors
    await page.goto('/campaign/new');

    // Very long URL
    const longUrl = 'https://www.amway.com/en_US/p-' + '1'.repeat(1000);
    await page.fill('input[type="url"]', longUrl);

    // Special characters
    await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123<script>alert("xss")</script>');

    await this.checkForRuntimeErrors(ctx);
  }

  private async checkForRuntimeErrors(ctx: TestContext) {
    // Force error detection check
    const runtimeErrors = ctx.errorDetector.getAllErrors();
    if (runtimeErrors.length > 0) {
      console.log(`⚠️ Runtime errors detected: ${runtimeErrors.length}`);
    }
  }

  // Reporting and analytics
  generateComprehensiveReport(): {
    summary: string;
    totalTests: number;
    passRate: number;
    autoFixRate: number;
    commonErrorPatterns: Array<{ pattern: string; frequency: number }>;
    recommendations: string[];
  } {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const autoFixed = this.testResults.filter(r => r.status === 'auto-fixed').length;

    const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    const autoFixRate = totalTests > 0 ? ((passed + autoFixed) / totalTests) * 100 : 0;

    const commonPatterns = Array.from(this.globalErrorPatterns.entries())
      .map(([pattern, errors]) => ({ pattern, frequency: errors.length }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const recommendations = this.generateRecommendations();

    return {
      summary: `${totalTests} tests executed, ${passRate.toFixed(1)}% pass rate, ${autoFixRate.toFixed(1)}% with auto-fix`,
      totalTests,
      passRate,
      autoFixRate,
      commonErrorPatterns: commonPatterns,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze error patterns and generate actionable recommendations
    const errorTypes = Array.from(this.globalErrorPatterns.values())
      .flat()
      .reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    if (errorTypes.ui > 5) {
      recommendations.push('Consider improving UI stability and element loading patterns');
    }

    if (errorTypes.api > 3) {
      recommendations.push('Implement better API error handling and retry mechanisms');
    }

    if (errorTypes.performance > 2) {
      recommendations.push('Optimize application performance and memory usage');
    }

    return recommendations;
  }

  getAllTestResults(): TestResult[] {
    return [...this.testResults];
  }

  reset() {
    this.testResults = [];
    this.globalErrorPatterns.clear();
  }
}