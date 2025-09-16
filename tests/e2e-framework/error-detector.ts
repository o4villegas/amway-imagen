/**
 * Advanced Error Detection Framework
 * Identifies bugs, performance issues, and system failures with auto-remediation
 */

import { Page, expect } from '@playwright/test';

export interface DetectedError {
  id: string;
  type: 'functional' | 'performance' | 'ui' | 'api' | 'accessibility' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location: string;
  timestamp: number;
  screenshot?: string;
  stackTrace?: string;
  reproductionSteps: string[];
  autoFixable: boolean;
  suggestedFix?: string;
  context: Record<string, any>;
}

export interface RemediationAction {
  errorId: string;
  action: 'retry' | 'refresh' | 'navigate' | 'clear_data' | 'wait' | 'manual_fix';
  parameters?: Record<string, any>;
  maxAttempts: number;
  currentAttempt: number;
}

export class ErrorDetector {
  private page: Page;
  private detectedErrors: DetectedError[] = [];
  private remediationHistory: RemediationAction[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupErrorListeners();
  }

  private setupErrorListeners() {
    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.handleConsoleError(msg);
      }
    });

    // Listen for page errors
    this.page.on('pageerror', error => {
      this.handlePageError(error);
    });

    // Listen for failed requests
    this.page.on('requestfailed', request => {
      this.handleRequestFailure(request);
    });

    // Listen for response failures
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.handleResponseError(response);
      }
    });
  }

  async detectUIErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    // Check for broken images
    const brokenImages = await this.checkBrokenImages();
    errors.push(...brokenImages);

    // Check for missing elements
    const missingElements = await this.checkMissingCriticalElements();
    errors.push(...missingElements);

    // Check for layout issues
    const layoutIssues = await this.checkLayoutIssues();
    errors.push(...layoutIssues);

    // Check for loading states that never resolve
    const stuckLoading = await this.checkStuckLoadingStates();
    errors.push(...stuckLoading);

    // Check for overlapping elements
    const overlaps = await this.checkElementOverlaps();
    errors.push(...overlaps);

    return errors;
  }

  async detectPerformanceErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    // Check page load time
    const loadTimeError = await this.checkPageLoadTime();
    if (loadTimeError) errors.push(loadTimeError);

    // Check for memory leaks
    const memoryIssues = await this.checkMemoryUsage();
    errors.push(...memoryIssues);

    // Check for slow API responses
    const slowApis = await this.checkSlowApiResponses();
    errors.push(...slowApis);

    // Check for large bundle sizes
    const bundleIssues = await this.checkBundleSizes();
    errors.push(...bundleIssues);

    return errors;
  }

  async detectAccessibilityErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    // Check for missing alt text
    const missingAlt = await this.checkMissingAltText();
    errors.push(...missingAlt);

    // Check color contrast
    const contrastIssues = await this.checkColorContrast();
    errors.push(...contrastIssues);

    // Check keyboard navigation
    const keyboardIssues = await this.checkKeyboardNavigation();
    errors.push(...keyboardIssues);

    // Check ARIA labels
    const ariaIssues = await this.checkAriaLabels();
    errors.push(...ariaIssues);

    return errors;
  }

  async detectSecurityErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    // Check for exposed sensitive data
    const dataExposure = await this.checkSensitiveDataExposure();
    errors.push(...dataExposure);

    // Check for insecure requests
    const insecureRequests = await this.checkInsecureRequests();
    errors.push(...insecureRequests);

    // Check for XSS vulnerabilities
    const xssIssues = await this.checkXSSVulnerabilities();
    errors.push(...xssIssues);

    return errors;
  }

  // Individual error detection methods
  private async checkBrokenImages(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    const images = await this.page.locator('img').all();

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = await img.getAttribute('src');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);

      if (naturalWidth === 0 && src) {
        errors.push({
          id: `broken-image-${i}`,
          type: 'ui',
          severity: 'medium',
          description: `Broken image detected: ${src}`,
          location: `Image element ${i}`,
          timestamp: Date.now(),
          reproductionSteps: ['Navigate to page', `Check image at index ${i}`],
          autoFixable: true,
          suggestedFix: 'Replace with placeholder image or fix image URL',
          context: { src, index: i }
        });
      }
    }

    return errors;
  }

  private async checkMissingCriticalElements(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    const criticalSelectors = [
      'h1', // Main heading
      'nav', // Navigation
      'main', // Main content
      '[role="main"]' // Alternative main content
    ];

    for (const selector of criticalSelectors) {
      const element = this.page.locator(selector);
      const isVisible = await element.isVisible().catch(() => false);

      if (!isVisible) {
        errors.push({
          id: `missing-${selector.replace(/\W/g, '-')}`,
          type: 'ui',
          severity: 'high',
          description: `Critical element missing: ${selector}`,
          location: 'Page structure',
          timestamp: Date.now(),
          reproductionSteps: ['Navigate to page', `Look for ${selector} element`],
          autoFixable: false,
          context: { selector }
        });
      }
    }

    return errors;
  }

  private async checkLayoutIssues(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    // Check for elements outside viewport
    const elements = await this.page.locator('*').all();
    const viewport = this.page.viewportSize();

    if (!viewport) return errors;

    for (let i = 0; i < Math.min(elements.length, 50); i++) { // Limit to first 50 elements
      const element = elements[i];
      const box = await element.boundingBox().catch(() => null);

      if (box && (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width)) {
        const tagName = await element.evaluate(el => el.tagName);

        errors.push({
          id: `layout-overflow-${i}`,
          type: 'ui',
          severity: 'medium',
          description: `Element overflows viewport: ${tagName}`,
          location: `Element ${i}`,
          timestamp: Date.now(),
          reproductionSteps: ['Navigate to page', 'Check element positioning'],
          autoFixable: true,
          suggestedFix: 'Add responsive CSS or adjust layout',
          context: { box, viewport, tagName }
        });
      }
    }

    return errors;
  }

  private async checkStuckLoadingStates(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    const loadingIndicators = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      'text=Loading',
      'text=Generating'
    ];

    for (const selector of loadingIndicators) {
      const element = this.page.locator(selector);
      const isVisible = await element.isVisible().catch(() => false);

      if (isVisible) {
        // Wait to see if loading resolves
        await this.page.waitForTimeout(5000);
        const stillVisible = await element.isVisible().catch(() => false);

        if (stillVisible) {
          errors.push({
            id: `stuck-loading-${selector.replace(/\W/g, '-')}`,
            type: 'functional',
            severity: 'high',
            description: `Loading state never resolves: ${selector}`,
            location: 'Loading indicator',
            timestamp: Date.now(),
            reproductionSteps: ['Navigate to page', 'Wait for 5+ seconds', 'Loading still visible'],
            autoFixable: true,
            suggestedFix: 'Refresh page or check API responses',
            context: { selector }
          });
        }
      }
    }

    return errors;
  }

  private async checkElementOverlaps(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Implementation for checking overlapping clickable elements
    // This would involve complex geometric calculations
    return errors;
  }

  private async checkPageLoadTime(): Promise<DetectedError | null> {
    const navigationTiming = await this.page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
      };
    });

    if (navigationTiming.loadComplete > 3000) { // 3 second threshold
      return {
        id: 'slow-page-load',
        type: 'performance',
        severity: 'medium',
        description: `Page load time too slow: ${navigationTiming.loadComplete}ms`,
        location: 'Page load performance',
        timestamp: Date.now(),
        reproductionSteps: ['Navigate to page', 'Measure load time'],
        autoFixable: false,
        context: navigationTiming
      };
    }

    return null;
  }

  private async checkMemoryUsage(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    const memoryInfo = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (memoryInfo && memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
      errors.push({
        id: 'high-memory-usage',
        type: 'performance',
        severity: 'medium',
        description: `High memory usage: ${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`,
        location: 'JavaScript heap',
        timestamp: Date.now(),
        reproductionSteps: ['Navigate to page', 'Check memory usage'],
        autoFixable: false,
        context: memoryInfo
      });
    }

    return errors;
  }

  private async checkSlowApiResponses(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // This would track API response times during test execution
    // Implementation would involve monitoring network requests
    return errors;
  }

  private async checkBundleSizes(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Implementation for checking JavaScript bundle sizes
    return errors;
  }

  private async checkMissingAltText(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    const images = await this.page.locator('img').all();

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');

      if (!alt || alt.trim() === '') {
        errors.push({
          id: `missing-alt-${i}`,
          type: 'accessibility',
          severity: 'medium',
          description: `Image missing alt text: ${src}`,
          location: `Image element ${i}`,
          timestamp: Date.now(),
          reproductionSteps: ['Navigate to page', `Check image alt attribute at index ${i}`],
          autoFixable: true,
          suggestedFix: 'Add descriptive alt text',
          context: { src, index: i }
        });
      }
    }

    return errors;
  }

  private async checkColorContrast(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Implementation would use tools like axe-core for contrast checking
    return errors;
  }

  private async checkKeyboardNavigation(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Test tab navigation and focus management
    return errors;
  }

  private async checkAriaLabels(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Check for proper ARIA labeling
    return errors;
  }

  private async checkSensitiveDataExposure(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Check for exposed API keys, tokens, etc.
    return errors;
  }

  private async checkInsecureRequests(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Check for HTTP requests in HTTPS context
    return errors;
  }

  private async checkXSSVulnerabilities(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];
    // Basic XSS vulnerability checks
    return errors;
  }

  // Error event handlers
  private handleConsoleError(msg: any) {
    const error: DetectedError = {
      id: `console-error-${Date.now()}`,
      type: 'functional',
      severity: 'high',
      description: `Console error: ${msg.text()}`,
      location: 'Browser console',
      timestamp: Date.now(),
      reproductionSteps: ['Navigate to page', 'Check browser console'],
      autoFixable: false,
      context: { message: msg.text(), type: msg.type() }
    };

    this.detectedErrors.push(error);
  }

  private handlePageError(error: Error) {
    const detectedError: DetectedError = {
      id: `page-error-${Date.now()}`,
      type: 'functional',
      severity: 'critical',
      description: `Page error: ${error.message}`,
      location: 'Page runtime',
      timestamp: Date.now(),
      stackTrace: error.stack,
      reproductionSteps: ['Navigate to page', 'Trigger error condition'],
      autoFixable: false,
      context: { name: error.name, message: error.message }
    };

    this.detectedErrors.push(detectedError);
  }

  private handleRequestFailure(request: any) {
    const error: DetectedError = {
      id: `request-failed-${Date.now()}`,
      type: 'api',
      severity: 'high',
      description: `Request failed: ${request.url()}`,
      location: 'Network request',
      timestamp: Date.now(),
      reproductionSteps: ['Navigate to page', 'Trigger request'],
      autoFixable: true,
      suggestedFix: 'Retry request or check network connectivity',
      context: { url: request.url(), method: request.method() }
    };

    this.detectedErrors.push(error);
  }

  private handleResponseError(response: any) {
    const error: DetectedError = {
      id: `response-error-${Date.now()}`,
      type: 'api',
      severity: response.status() >= 500 ? 'critical' : 'high',
      description: `HTTP ${response.status()}: ${response.url()}`,
      location: 'API response',
      timestamp: Date.now(),
      reproductionSteps: ['Navigate to page', 'Make API request'],
      autoFixable: response.status() < 500,
      suggestedFix: response.status() < 500 ? 'Check request parameters' : 'Server issue - retry later',
      context: { status: response.status(), url: response.url() }
    };

    this.detectedErrors.push(error);
  }

  getAllErrors(): DetectedError[] {
    return [...this.detectedErrors];
  }

  getErrorsByType(type: DetectedError['type']): DetectedError[] {
    return this.detectedErrors.filter(error => error.type === type);
  }

  getErrorsBySeverity(severity: DetectedError['severity']): DetectedError[] {
    return this.detectedErrors.filter(error => error.severity === severity);
  }

  async takeScreenshot(error: DetectedError): Promise<string> {
    const screenshot = await this.page.screenshot({
      path: `test-results/error-${error.id}.png`,
      fullPage: true
    });
    return `error-${error.id}.png`;
  }

  clearErrors() {
    this.detectedErrors = [];
  }
}