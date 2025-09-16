#!/usr/bin/env node

/**
 * Comprehensive Testing Agent for Amway IBO Image Campaign Generator
 *
 * This agent performs deep analysis and real browser testing to identify:
 * - Technical issues and bugs
 * - Performance bottlenecks
 * - Security vulnerabilities
 * - UI/UX problems
 * - AI prompt optimization opportunities
 * - Database and API issues
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestingAgent {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      performance: [],
      security: [],
      optimization: [],
      accessibility: [],
    };

    this.metrics = {
      pageLoadTimes: [],
      apiResponseTimes: [],
      imageGenerationTimes: [],
      errorCounts: {},
      networkFailures: []
    };

    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };

    this.baseUrl = 'http://localhost:8788';
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) console.log('Data:', JSON.stringify(data, null, 2));
  }

  addFinding(severity, category, title, description, details = {}) {
    const finding = {
      title,
      description,
      severity,
      category,
      details,
      timestamp: new Date().toISOString()
    };

    this.findings[severity].push(finding);
    this.log('FINDING', `${severity.toUpperCase()}: ${title}`, finding);
  }

  async testPagePerformance(page, pageName) {
    try {
      const startTime = Date.now();

      // Track resource loading
      const resources = [];
      page.on('response', response => {
        resources.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'] || 0
        });
      });

      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      this.metrics.pageLoadTimes.push({ page: pageName, loadTime });

      // Analyze Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};

          // LCP (Largest Contentful Paint)
          if ('PerformanceObserver' in window) {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              vitals.lcp = lastEntry.startTime;
            }).observe({ entryTypes: ['largest-contentful-paint'] });
          }

          // FID (First Input Delay) - approximated
          vitals.fid = 0; // Would need real user interaction

          // CLS (Cumulative Layout Shift)
          if ('PerformanceObserver' in window) {
            let clsValue = 0;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              }
              vitals.cls = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });
          }

          setTimeout(() => resolve(vitals), 1000);
        });
      });

      // Performance analysis
      if (loadTime > 3000) {
        this.addFinding('high', 'performance', 'Slow Page Load Time',
          `Page ${pageName} loaded in ${loadTime}ms, exceeding 3s threshold`,
          { loadTime, resources: resources.slice(0, 10) });
      }

      if (webVitals.lcp > 2500) {
        this.addFinding('medium', 'performance', 'Poor LCP Score',
          `Largest Contentful Paint is ${webVitals.lcp}ms (should be < 2.5s)`,
          { lcp: webVitals.lcp });
      }

      if (webVitals.cls > 0.1) {
        this.addFinding('medium', 'performance', 'Poor CLS Score',
          `Cumulative Layout Shift is ${webVitals.cls} (should be < 0.1)`,
          { cls: webVitals.cls });
      }

      return { loadTime, webVitals, resources };

    } catch (error) {
      this.addFinding('high', 'performance', 'Performance Test Failed',
        `Could not complete performance analysis for ${pageName}`,
        { error: error.message });
      return null;
    }
  }

  async testAccessibility(page, pageName) {
    try {
      // Check for basic accessibility requirements
      const accessibilityIssues = await page.evaluate(() => {
        const issues = [];

        // Check for images without alt text
        const images = document.querySelectorAll('img');
        images.forEach((img, index) => {
          if (!img.alt && !img.getAttribute('aria-label')) {
            issues.push({
              type: 'missing-alt-text',
              element: `img[${index}]`,
              src: img.src
            });
          }
        });

        // Check for form inputs without labels
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((input, index) => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledby = input.getAttribute('aria-labelledby');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
            issues.push({
              type: 'missing-form-label',
              element: `${input.tagName.toLowerCase()}[${index}]`,
              id: id || 'no-id'
            });
          }
        });

        // Check for buttons without accessible text
        const buttons = document.querySelectorAll('button');
        buttons.forEach((button, index) => {
          const hasText = button.textContent.trim();
          const hasAriaLabel = button.getAttribute('aria-label');
          const hasAriaLabelledby = button.getAttribute('aria-labelledby');

          if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
            issues.push({
              type: 'button-no-accessible-text',
              element: `button[${index}]`
            });
          }
        });

        // Check color contrast (basic check)
        const elements = document.querySelectorAll('*');
        let contrastIssues = 0;
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const textColor = style.color;
          const bgColor = style.backgroundColor;

          // This is a simplified check - a full implementation would calculate actual contrast ratios
          if (textColor === bgColor) {
            contrastIssues++;
          }
        });

        if (contrastIssues > 0) {
          issues.push({
            type: 'potential-contrast-issues',
            count: contrastIssues
          });
        }

        return issues;
      });

      accessibilityIssues.forEach(issue => {
        let severity = 'medium';
        if (issue.type === 'missing-alt-text' || issue.type === 'missing-form-label') {
          severity = 'high';
        }

        this.addFinding(severity, 'accessibility', `Accessibility Issue: ${issue.type}`,
          `Found accessibility issue on ${pageName}`,
          issue);
      });

      return accessibilityIssues;

    } catch (error) {
      this.addFinding('medium', 'accessibility', 'Accessibility Test Failed',
        `Could not complete accessibility analysis for ${pageName}`,
        { error: error.message });
      return [];
    }
  }

  async testSecurityHeaders(page) {
    try {
      const response = await page.goto(this.baseUrl);
      const headers = response.headers();

      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy'],
        'referrer-policy': headers['referrer-policy']
      };

      // Check for missing security headers
      if (!securityHeaders['x-frame-options']) {
        this.addFinding('medium', 'security', 'Missing X-Frame-Options Header',
          'Page is vulnerable to clickjacking attacks',
          { recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN' });
      }

      if (!securityHeaders['x-content-type-options']) {
        this.addFinding('medium', 'security', 'Missing X-Content-Type-Options Header',
          'Page is vulnerable to MIME sniffing attacks',
          { recommendation: 'Add X-Content-Type-Options: nosniff' });
      }

      if (!securityHeaders['content-security-policy']) {
        this.addFinding('high', 'security', 'Missing Content Security Policy',
          'Page lacks CSP protection against XSS and injection attacks',
          { recommendation: 'Implement a strict Content-Security-Policy header' });
      }

      if (!headers['set-cookie'] || !headers['set-cookie'].includes('Secure')) {
        this.addFinding('medium', 'security', 'Insecure Cookie Settings',
          'Cookies may not have Secure flag set',
          { recommendation: 'Ensure all cookies have Secure and HttpOnly flags' });
      }

      return securityHeaders;

    } catch (error) {
      this.addFinding('high', 'security', 'Security Header Test Failed',
        'Could not analyze security headers',
        { error: error.message });
      return {};
    }
  }

  async testAPIEndpoints(page) {
    try {
      const apiTests = [
        {
          endpoint: '/api/scrape',
          method: 'POST',
          body: { productUrl: 'https://www.amway.com/en_US/p/nutrilite-double-x-vitamin-mineral-phytonutrient-supplement-p-100291' },
          expectedStatus: [200, 400, 429]
        },
        {
          endpoint: '/api/campaign/generate',
          method: 'POST',
          body: {
            productId: 1,
            preferences: {
              campaign_type: 'product_focus',
              brand_style: 'professional',
              color_scheme: 'amway_brand',
              text_overlay: 'minimal',
              campaign_size: 5,
              image_formats: ['instagram_post']
            }
          },
          expectedStatus: [200, 400, 404, 429, 500]
        }
      ];

      for (const test of apiTests) {
        try {
          const startTime = Date.now();

          const response = await page.evaluate(async (testConfig) => {
            const response = await fetch(testConfig.endpoint, {
              method: testConfig.method,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(testConfig.body)
            });

            return {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: await response.text()
            };
          }, test);

          const responseTime = Date.now() - startTime;
          this.metrics.apiResponseTimes.push({
            endpoint: test.endpoint,
            responseTime,
            status: response.status
          });

          // Analyze response
          if (!test.expectedStatus.includes(response.status)) {
            this.addFinding('high', 'api', `Unexpected API Response: ${test.endpoint}`,
              `API returned status ${response.status}, expected one of ${test.expectedStatus.join(', ')}`,
              { response: response });
          }

          if (responseTime > 5000) {
            this.addFinding('medium', 'performance', `Slow API Response: ${test.endpoint}`,
              `API response took ${responseTime}ms, exceeding 5s threshold`,
              { responseTime, endpoint: test.endpoint });
          }

          // Check for proper error handling
          if (response.status >= 400) {
            try {
              const errorBody = JSON.parse(response.body);
              if (!errorBody.error) {
                this.addFinding('medium', 'api', `Poor Error Response: ${test.endpoint}`,
                  'API error response lacks proper error message structure',
                  { response: response });
              }
            } catch (parseError) {
              this.addFinding('medium', 'api', `Invalid Error Response: ${test.endpoint}`,
                'API error response is not valid JSON',
                { response: response });
            }
          }

        } catch (error) {
          this.addFinding('high', 'api', `API Test Failed: ${test.endpoint}`,
            `Could not test API endpoint`,
            { error: error.message, endpoint: test.endpoint });
        }
      }

    } catch (error) {
      this.addFinding('critical', 'api', 'API Testing Failed',
        'Could not perform API endpoint testing',
        { error: error.message });
    }
  }

  async testUserJourney(page) {
    try {
      this.log('info', 'Starting comprehensive user journey test');

      // Test 1: Landing page load
      await page.goto(this.baseUrl);
      await this.testPagePerformance(page, 'landing');
      await this.testAccessibility(page, 'landing');

      // Test 2: Navigation to campaign creation
      try {
        await page.click('text=Create Campaign', { timeout: 5000 });
        await page.waitForURL('**/campaign/new', { timeout: 10000 });
        this.testResults.passed++;
      } catch (error) {
        this.addFinding('high', 'navigation', 'Campaign Creation Navigation Failed',
          'Could not navigate to campaign creation page',
          { error: error.message });
        this.testResults.failed++;
      }

      // Test 3: URL input validation
      const testUrls = [
        { url: '', expected: 'error', description: 'empty URL' },
        { url: 'not-a-url', expected: 'error', description: 'invalid URL format' },
        { url: 'https://www.google.com', expected: 'error', description: 'non-Amway URL' },
        { url: 'https://www.amway.com/en_US/p/nutrilite-double-x-vitamin-mineral-phytonutrient-supplement-p-100291', expected: 'success', description: 'valid Amway URL' }
      ];

      for (const testUrl of testUrls) {
        try {
          // Clear input and enter URL
          await page.fill('input[type="url"]', testUrl.url);
          await page.click('button:has-text("Analyze Product")');

          if (testUrl.expected === 'error') {
            // Should show error message
            const errorVisible = await page.locator('.error, .alert-destructive, [role="alert"]').isVisible({ timeout: 3000 }).catch(() => false);
            if (!errorVisible) {
              this.addFinding('medium', 'validation', `URL Validation Missing: ${testUrl.description}`,
                'URL input should show error for invalid input but does not',
                { testUrl: testUrl });
            } else {
              this.testResults.passed++;
            }
          } else {
            // Should proceed successfully or show appropriate loading state
            const loadingOrSuccess = await Promise.race([
              page.locator('.loading, .spinner, .progress').isVisible({ timeout: 5000 }).catch(() => false),
              page.locator('.product-preview, .product-info').isVisible({ timeout: 5000 }).catch(() => false)
            ]);

            if (!loadingOrSuccess) {
              this.addFinding('medium', 'functionality', `Product Analysis Failed: ${testUrl.description}`,
                'Valid URL should trigger analysis but shows no response',
                { testUrl: testUrl });
            } else {
              this.testResults.passed++;
            }
          }

        } catch (error) {
          this.addFinding('medium', 'functionality', `URL Test Error: ${testUrl.description}`,
            'Error during URL validation testing',
            { testUrl: testUrl, error: error.message });
          this.testResults.failed++;
        }
      }

      // Test 4: Form interactions and validation
      try {
        // Test campaign preferences
        const preferences = [
          { selector: 'input[value="product_focus"]', name: 'campaign type' },
          { selector: 'input[value="professional"]', name: 'brand style' },
          { selector: 'input[value="minimal"]', name: 'text overlay' }
        ];

        for (const pref of preferences) {
          const element = await page.locator(pref.selector).first();
          if (await element.isVisible().catch(() => false)) {
            await element.click();
            this.testResults.passed++;
          } else {
            this.addFinding('medium', 'ui', `Missing Form Element: ${pref.name}`,
              `Could not find or interact with ${pref.name} option`,
              { selector: pref.selector });
            this.testResults.failed++;
          }
        }

      } catch (error) {
        this.addFinding('high', 'functionality', 'Form Interaction Failed',
          'Could not interact with campaign preference forms',
          { error: error.message });
        this.testResults.failed++;
      }

      // Test 5: Mobile responsiveness
      await this.testMobileResponsiveness(page);

      // Test 6: JavaScript error detection
      const jsErrors = await this.detectJavaScriptErrors(page);
      if (jsErrors.length > 0) {
        this.addFinding('high', 'functionality', 'JavaScript Errors Detected',
          `Found ${jsErrors.length} JavaScript errors on the page`,
          { errors: jsErrors });
      }

      this.log('info', 'User journey testing completed');

    } catch (error) {
      this.addFinding('critical', 'functionality', 'User Journey Test Failed',
        'Critical failure in user journey testing',
        { error: error.message });
    }
  }

  async testMobileResponsiveness(page) {
    try {
      const viewports = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1920, height: 1080 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000); // Allow for responsive adjustments

        // Check for horizontal scrolling (usually indicates poor mobile design)
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalScroll && viewport.width < 768) {
          this.addFinding('medium', 'ui', `Horizontal Scroll on ${viewport.name}`,
            'Page has horizontal scrolling on mobile viewport, indicating responsive design issues',
            { viewport: viewport });
        }

        // Check for overlapping elements
        const overlaps = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const overlaps = [];

          for (let i = 0; i < elements.length; i++) {
            const rect1 = elements[i].getBoundingClientRect();
            if (rect1.width === 0 || rect1.height === 0) continue;

            for (let j = i + 1; j < elements.length; j++) {
              const rect2 = elements[j].getBoundingClientRect();
              if (rect2.width === 0 || rect2.height === 0) continue;

              if (rect1.left < rect2.right && rect2.left < rect1.right &&
                  rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
                overlaps.push({
                  element1: elements[i].tagName + (elements[i].id ? '#' + elements[i].id : ''),
                  element2: elements[j].tagName + (elements[j].id ? '#' + elements[j].id : '')
                });
              }

              if (overlaps.length > 10) break; // Limit to avoid performance issues
            }
            if (overlaps.length > 10) break;
          }

          return overlaps;
        });

        if (overlaps.length > 0) {
          this.addFinding('medium', 'ui', `Element Overlaps on ${viewport.name}`,
            'Detected overlapping elements that may indicate layout issues',
            { viewport: viewport, overlaps: overlaps.slice(0, 5) });
        }

        this.testResults.passed++;
      }

    } catch (error) {
      this.addFinding('medium', 'ui', 'Mobile Responsiveness Test Failed',
        'Could not complete mobile responsiveness testing',
        { error: error.message });
      this.testResults.failed++;
    }
  }

  async detectJavaScriptErrors(page) {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console-error',
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', error => {
      errors.push({
        type: 'page-error',
        message: error.message,
        stack: error.stack
      });
    });

    return errors;
  }

  async analyzeCodeQuality() {
    try {
      this.log('info', 'Starting code quality analysis');

      // Analyze key files for common issues
      const filesToAnalyze = [
        '/home/lando555/amway-imagen/app/api/scrape/route.ts',
        '/home/lando555/amway-imagen/app/api/campaign/generate/route.ts',
        '/home/lando555/amway-imagen/lib/scraper.ts',
        '/home/lando555/amway-imagen/lib/prompt-generator.ts',
        '/home/lando555/amway-imagen/lib/db.ts'
      ];

      for (const filePath of filesToAnalyze) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          this.analyzeFileContent(filePath, content);
        }
      }

    } catch (error) {
      this.addFinding('medium', 'code-quality', 'Code Analysis Failed',
        'Could not complete static code analysis',
        { error: error.message });
    }
  }

  analyzeFileContent(filePath, content) {
    const filename = path.basename(filePath);

    // Check for security issues
    if (content.includes('eval(') || content.includes('Function(')) {
      this.addFinding('critical', 'security', `Dangerous Code: ${filename}`,
        'File contains eval() or Function() which can lead to code injection',
        { file: filePath });
    }

    // Check for unhandled promises
    const promiseRegex = /\.(then|catch)\(/g;
    const asyncRegex = /async\s+function|async\s+\(/g;
    const awaitRegex = /await\s+/g;

    const promiseCount = (content.match(promiseRegex) || []).length;
    const asyncCount = (content.match(asyncRegex) || []).length;
    const awaitCount = (content.match(awaitRegex) || []).length;

    if (promiseCount > awaitCount + asyncCount) {
      this.addFinding('medium', 'code-quality', `Potential Unhandled Promises: ${filename}`,
        'File may have promises without proper error handling',
        { file: filePath, promiseCount, awaitCount });
    }

    // Check for hardcoded secrets or sensitive data
    const sensitivePatterns = [
      /password\s*[:=]\s*["'][^"']+["']/gi,
      /api_key\s*[:=]\s*["'][^"']+["']/gi,
      /secret\s*[:=]\s*["'][^"']+["']/gi,
      /token\s*[:=]\s*["'][^"']+["']/gi
    ];

    sensitivePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        this.addFinding('critical', 'security', `Potential Hardcoded Secrets: ${filename}`,
          'File may contain hardcoded sensitive information',
          { file: filePath, matches: matches.length });
      }
    });

    // Check for SQL injection vulnerabilities
    if (content.includes('db.prepare(') && content.includes('${')) {
      this.addFinding('high', 'security', `SQL Injection Risk: ${filename}`,
        'File uses string interpolation in database queries which may lead to SQL injection',
        { file: filePath });
    }

    // Check for console.log in production code
    const consoleLogMatches = content.match(/console\.log\(/g);
    if (consoleLogMatches && consoleLogMatches.length > 3) {
      this.addFinding('low', 'code-quality', `Excessive Console Logging: ${filename}`,
        'File contains many console.log statements that should be removed in production',
        { file: filePath, count: consoleLogMatches.length });
    }

    // Check for error handling
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const catchBlocks = (content.match(/catch\s*\(/g) || []).length;

    if (tryBlocks !== catchBlocks) {
      this.addFinding('medium', 'code-quality', `Error Handling Mismatch: ${filename}`,
        'File has mismatched try/catch blocks indicating potential error handling issues',
        { file: filePath, tryCount: tryBlocks, catchCount: catchBlocks });
    }
  }

  async generateReport() {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalFindings: Object.values(this.findings).flat().length,
        criticalIssues: this.findings.critical.length,
        highIssues: this.findings.high.length,
        mediumIssues: this.findings.medium.length,
        lowIssues: this.findings.low.length,
        testResults: this.testResults,
        performanceMetrics: this.metrics
      },
      findings: this.findings,
      recommendations: this.generateRecommendations(),
      metrics: this.metrics
    };

    // Write detailed report to file
    const reportPath = '/home/lando555/amway-imagen/comprehensive-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = '/home/lando555/amway-imagen/test-findings-summary.md';
    fs.writeFileSync(markdownPath, markdownReport);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.findings.critical.length > 0) {
      recommendations.push({
        priority: 'immediate',
        category: 'security',
        action: 'Address critical security vulnerabilities immediately',
        details: 'Critical issues pose immediate security risks and should be fixed before deployment.'
      });
    }

    if (this.metrics.pageLoadTimes.some(metric => metric.loadTime > 3000)) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Optimize page load performance',
        details: 'Implement code splitting, optimize images, and reduce bundle size to improve load times.'
      });
    }

    if (this.findings.accessibility.length > 5) {
      recommendations.push({
        priority: 'high',
        category: 'accessibility',
        action: 'Improve accessibility compliance',
        details: 'Add proper alt text, form labels, and ARIA attributes to improve accessibility.'
      });
    }

    if (this.metrics.apiResponseTimes.some(api => api.responseTime > 5000)) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        action: 'Optimize API response times',
        details: 'Implement caching, optimize database queries, and consider pagination for large responses.'
      });
    }

    return recommendations;
  }

  generateMarkdownReport(report) {
    return `# Comprehensive Test Report - Amway IBO Image Campaign Generator

## Executive Summary

- **Total Findings:** ${report.summary.totalFindings}
- **Critical Issues:** ${report.summary.criticalIssues} 🔴
- **High Priority:** ${report.summary.highIssues} 🟠
- **Medium Priority:** ${report.summary.mediumIssues} 🟡
- **Low Priority:** ${report.summary.lowIssues} 🟢

## Test Results

- **Passed:** ${report.summary.testResults.passed}
- **Failed:** ${report.summary.testResults.failed}
- **Total Tests:** ${report.summary.testResults.passed + report.summary.testResults.failed}

## Performance Metrics

### Page Load Times
${report.metrics.pageLoadTimes.map(metric =>
  `- ${metric.page}: ${metric.loadTime}ms`
).join('\n')}

### API Response Times
${report.metrics.apiResponseTimes.map(metric =>
  `- ${metric.endpoint}: ${metric.responseTime}ms (${metric.status})`
).join('\n')}

## Critical Issues

${report.findings.critical.map(finding =>
  `### ${finding.title}\n**Category:** ${finding.category}\n**Description:** ${finding.description}\n`
).join('\n')}

## High Priority Issues

${report.findings.high.map(finding =>
  `### ${finding.title}\n**Category:** ${finding.category}\n**Description:** ${finding.description}\n`
).join('\n')}

## Recommendations

${report.recommendations.map(rec =>
  `### ${rec.action} (${rec.priority} priority)\n**Category:** ${rec.category}\n${rec.details}\n`
).join('\n')}

## Detailed Findings

See comprehensive-test-report.json for complete technical details.

---
*Report generated on ${report.summary.timestamp}*
`;
  }

  async run() {
    try {
      this.log('info', 'Starting comprehensive testing agent');

      // Launch browser
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (compatible; TestingAgent/1.0)'
      });

      const page = await context.newPage();

      // Enable request/response tracking
      await page.route('**/*', route => {
        route.continue();
      });

      // Test security headers
      await this.testSecurityHeaders(page);

      // Test API endpoints
      await this.testAPIEndpoints(page);

      // Test complete user journey
      await this.testUserJourney(page);

      // Analyze code quality
      await this.analyzeCodeQuality();

      // Generate comprehensive report
      const report = await this.generateReport();

      await browser.close();

      this.log('info', 'Testing completed successfully');
      return report;

    } catch (error) {
      this.log('error', 'Testing agent failed', { error: error.message });
      throw error;
    }
  }
}

// Run the testing agent
async function main() {
  const agent = new ComprehensiveTestingAgent();

  try {
    const report = await agent.run();

    console.log('\n=== COMPREHENSIVE TEST REPORT ===');
    console.log(`Total Findings: ${report.summary.totalFindings}`);
    console.log(`Critical: ${report.summary.criticalIssues}`);
    console.log(`High: ${report.summary.highIssues}`);
    console.log(`Medium: ${report.summary.mediumIssues}`);
    console.log(`Low: ${report.summary.lowIssues}`);
    console.log('\nDetailed reports saved to:');
    console.log('- comprehensive-test-report.json');
    console.log('- test-findings-summary.md');

  } catch (error) {
    console.error('Testing failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  main();
} else {
  module.exports = { ComprehensiveTestingAgent };
}