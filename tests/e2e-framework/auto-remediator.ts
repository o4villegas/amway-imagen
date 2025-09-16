/**
 * Auto-Remediation System
 * Automatically attempts to fix detected errors and issues
 */

import { Page } from '@playwright/test';
import { DetectedError, RemediationAction } from './error-detector';

export interface RemediationResult {
  success: boolean;
  error?: DetectedError;
  action: RemediationAction;
  message: string;
  retryRecommended: boolean;
  nextAction?: RemediationAction;
}

export class AutoRemediator {
  private page: Page;
  private remediationAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  constructor(page: Page) {
    this.page = page;
  }

  async remediate(error: DetectedError): Promise<RemediationResult> {
    const currentAttempts = this.remediationAttempts.get(error.id) || 0;
    this.remediationAttempts.set(error.id, currentAttempts + 1);

    const action: RemediationAction = {
      errorId: error.id,
      action: this.determineRemediationStrategy(error),
      maxAttempts: this.maxRetries,
      currentAttempt: currentAttempts + 1
    };

    console.log(`🔧 Attempting auto-remediation for ${error.type} error: ${error.description}`);
    console.log(`   Strategy: ${action.action} (Attempt ${action.currentAttempt}/${action.maxAttempts})`);

    try {
      switch (action.action) {
        case 'retry':
          return await this.retryOperation(error, action);
        case 'refresh':
          return await this.refreshPage(error, action);
        case 'navigate':
          return await this.navigateToSafePage(error, action);
        case 'clear_data':
          return await this.clearBrowserData(error, action);
        case 'wait':
          return await this.waitAndRetry(error, action);
        default:
          return await this.manualFixRequired(error, action);
      }
    } catch (remediationError: any) {
      return {
        success: false,
        error,
        action,
        message: `Remediation failed: ${remediationError.message}`,
        retryRecommended: action.currentAttempt < action.maxAttempts
      };
    }
  }

  private determineRemediationStrategy(error: DetectedError): RemediationAction['action'] {
    // AI-powered strategy selection based on error type and context
    switch (error.type) {
      case 'api':
        if (error.description.includes('timeout') || error.description.includes('failed')) {
          return 'retry';
        }
        if (error.description.includes('5')) { // 5xx errors
          return 'wait';
        }
        if (error.description.includes('4')) { // 4xx errors
          return 'refresh';
        }
        return 'retry';

      case 'ui':
        if (error.description.includes('loading') || error.description.includes('stuck')) {
          return 'refresh';
        }
        if (error.description.includes('broken image')) {
          return 'retry';
        }
        if (error.description.includes('missing') || error.description.includes('layout')) {
          return 'refresh';
        }
        return 'wait';

      case 'functional':
        if (error.description.includes('console error') || error.description.includes('runtime')) {
          return 'refresh';
        }
        return 'retry';

      case 'performance':
        if (error.description.includes('slow') || error.description.includes('memory')) {
          return 'clear_data';
        }
        return 'refresh';

      case 'accessibility':
        return 'manual_fix'; // Usually requires code changes

      case 'security':
        return 'manual_fix'; // Critical - requires manual intervention

      default:
        return 'retry';
    }
  }

  private async retryOperation(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    // Extract the original operation from error context and retry it
    if (error.context?.url && error.type === 'api') {
      // Retry API request
      try {
        const response = await this.page.request.get(error.context.url);
        if (response.ok()) {
          return {
            success: true,
            error,
            action,
            message: `API request retry successful: ${error.context.url}`,
            retryRecommended: false
          };
        }
      } catch (retryError) {
        // Continue to generic retry strategy
      }
    }

    if (error.context?.selector) {
      // Retry element interaction
      try {
        await this.page.locator(error.context.selector).waitFor({ timeout: 5000 });
        return {
          success: true,
          error,
          action,
          message: `Element interaction retry successful: ${error.context.selector}`,
          retryRecommended: false
        };
      } catch (retryError) {
        // Continue to fallback strategy
      }
    }

    // Generic retry - wait and check if error still exists
    await this.page.waitForTimeout(2000);

    return {
      success: false,
      error,
      action,
      message: 'Retry operation completed, verification needed',
      retryRecommended: action.currentAttempt < action.maxAttempts,
      nextAction: action.currentAttempt < action.maxAttempts ?
        { ...action, action: 'refresh', currentAttempt: action.currentAttempt + 1 } : undefined
    };
  }

  private async refreshPage(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    console.log('🔄 Refreshing page to resolve error...');

    const currentUrl = this.page.url();
    await this.page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for page to stabilize
    await this.page.waitForTimeout(3000);

    // Verify the refresh resolved the issue
    const stillHasError = await this.verifyErrorResolved(error);

    return {
      success: !stillHasError,
      error,
      action,
      message: stillHasError ?
        'Page refresh completed but error may persist' :
        'Page refresh successfully resolved the error',
      retryRecommended: stillHasError && action.currentAttempt < action.maxAttempts,
      nextAction: stillHasError && action.currentAttempt < action.maxAttempts ?
        { ...action, action: 'clear_data', currentAttempt: action.currentAttempt + 1 } : undefined
    };
  }

  private async navigateToSafePage(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    console.log('🏠 Navigating to safe page...');

    // Navigate to home page as safe fallback
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');

    return {
      success: true,
      error,
      action,
      message: 'Navigated to safe page, user can restart their journey',
      retryRecommended: false
    };
  }

  private async clearBrowserData(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    console.log('🧹 Clearing browser data...');

    // Clear local storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies
    const context = this.page.context();
    await context.clearCookies();

    // Refresh after clearing data
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    return {
      success: true,
      error,
      action,
      message: 'Browser data cleared and page refreshed',
      retryRecommended: false
    };
  }

  private async waitAndRetry(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    console.log('⏳ Waiting before retry...');

    // Progressive backoff: wait longer on each attempt
    const waitTime = action.currentAttempt * 5000; // 5s, 10s, 15s...
    await this.page.waitForTimeout(waitTime);

    // Check if error resolved itself
    const stillHasError = await this.verifyErrorResolved(error);

    return {
      success: !stillHasError,
      error,
      action,
      message: stillHasError ?
        `Waited ${waitTime}ms but error persists` :
        `Wait strategy successful - error resolved after ${waitTime}ms`,
      retryRecommended: stillHasError && action.currentAttempt < action.maxAttempts,
      nextAction: stillHasError && action.currentAttempt < action.maxAttempts ?
        { ...action, action: 'refresh', currentAttempt: action.currentAttempt + 1 } : undefined
    };
  }

  private async manualFixRequired(error: DetectedError, action: RemediationAction): Promise<RemediationResult> {
    console.log('⚠️ Manual intervention required');

    return {
      success: false,
      error,
      action,
      message: 'This error requires manual code changes or configuration updates',
      retryRecommended: false
    };
  }

  private async verifyErrorResolved(error: DetectedError): Promise<boolean> {
    // Type-specific verification logic
    switch (error.type) {
      case 'ui':
        return await this.verifyUIError(error);
      case 'api':
        return await this.verifyAPIError(error);
      case 'functional':
        return await this.verifyFunctionalError(error);
      case 'performance':
        return await this.verifyPerformanceError(error);
      default:
        return false; // Assume error persists if we can't verify
    }
  }

  private async verifyUIError(error: DetectedError): Promise<boolean> {
    if (error.description.includes('broken image') && error.context?.src) {
      // Check if image loads now
      try {
        const img = this.page.locator(`img[src="${error.context.src}"]`);
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        return naturalWidth > 0;
      } catch {
        return false;
      }
    }

    if (error.description.includes('missing') && error.context?.selector) {
      // Check if element exists now
      try {
        await this.page.locator(error.context.selector).waitFor({ timeout: 1000 });
        return true;
      } catch {
        return false;
      }
    }

    if (error.description.includes('loading')) {
      // Check if loading indicators are gone
      const loadingSelectors = ['.loading', '.spinner', '[data-testid="loading"]'];
      for (const selector of loadingSelectors) {
        const isVisible = await this.page.locator(selector).isVisible().catch(() => false);
        if (isVisible) return false;
      }
      return true;
    }

    return false;
  }

  private async verifyAPIError(error: DetectedError): Promise<boolean> {
    if (error.context?.url) {
      try {
        const response = await this.page.request.get(error.context.url);
        return response.ok();
      } catch {
        return false;
      }
    }
    return false;
  }

  private async verifyFunctionalError(error: DetectedError): Promise<boolean> {
    // For functional errors, we'd need to re-run the specific functionality
    // This is complex and would depend on the specific error type
    return false;
  }

  private async verifyPerformanceError(error: DetectedError): Promise<boolean> {
    if (error.description.includes('memory')) {
      const memoryInfo = await this.page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize
        } : null;
      });
      return memoryInfo ? memoryInfo.usedJSHeapSize < 50 * 1024 * 1024 : true;
    }
    return false;
  }

  // Smart remediation suggestions based on error patterns
  async generateRemediationPlan(errors: DetectedError[]): Promise<RemediationAction[]> {
    const plan: RemediationAction[] = [];

    // Group errors by type and priority
    const errorsByType = errors.reduce((acc, error) => {
      if (!acc[error.type]) acc[error.type] = [];
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, DetectedError[]>);

    // Prioritize critical errors first
    const priorityOrder: DetectedError['type'][] = ['security', 'functional', 'api', 'ui', 'performance', 'accessibility'];

    for (const type of priorityOrder) {
      if (errorsByType[type]) {
        for (const error of errorsByType[type]) {
          plan.push({
            errorId: error.id,
            action: this.determineRemediationStrategy(error),
            maxAttempts: this.maxRetries,
            currentAttempt: 0
          });
        }
      }
    }

    return plan;
  }

  // Batch remediation for multiple errors
  async remediateAll(errors: DetectedError[]): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];
    const plan = await this.generateRemediationPlan(errors);

    for (const action of plan) {
      const error = errors.find(e => e.id === action.errorId);
      if (error) {
        const result = await this.remediate(error);
        results.push(result);

        // If remediation failed and suggests a next action, try it
        if (!result.success && result.nextAction) {
          const nextResult = await this.remediate(error);
          results.push(nextResult);
        }

        // Brief pause between remediations to avoid overwhelming the system
        await this.page.waitForTimeout(1000);
      }
    }

    return results;
  }

  getRemediationStats(): { attempted: number; successful: number; failed: number } {
    const attempted = this.remediationAttempts.size;
    // This would track success/failure rates in a real implementation
    return {
      attempted,
      successful: 0, // Would be tracked during remediation
      failed: 0      // Would be tracked during remediation
    };
  }

  reset() {
    this.remediationAttempts.clear();
  }
}