/**
 * Comprehensive UX Analysis Script for Amway IBO Image Campaign Generator
 * Tests all aspects of user experience including accessibility, performance, and functionality
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = '/home/lando555/amway-imagen/ux-analysis-2025-09-15-182322';
const BASE_URL = 'http://localhost:3001';

// Test configurations for different viewport sizes
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// Sample Amway URLs for testing
const TEST_URLS = [
  'https://www.amway.com/en_US/p/326782',  // Nutrilite Begin 30
  'https://www.amway.com/en_US/p/110798',  // XS Energy Drink
  'https://www.amway.com/en_US/p/100186'   // Nutrilite Daily
];

class UXAnalysisAgent {
  constructor() {
    this.browser = null;
    this.issues = [];
    this.performanceData = {};
    this.screenshotCounter = 0;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/automated testing
      slowMo: 100 // Slow down operations for better observation
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async logIssue(severity, category, title, details) {
    const issue = {
      id: `ISSUE-${this.issues.length + 1}`,
      severity,
      category,
      title,
      timestamp: new Date().toISOString(),
      ...details
    };
    this.issues.push(issue);
    console.log(`🚨 ${severity.toUpperCase()}: ${title}`);
  }

  async captureScreenshot(page, filename, viewport = 'desktop') {
    const screenshotPath = path.join(RESULTS_DIR, 'screenshots', viewport, `${filename}-${++this.screenshotCounter}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  async startRecording(page, filename) {
    const videoPath = path.join(RESULTS_DIR, 'recordings', 'workflows', `${filename}.webm`);
    await page.video?.delete();
    return videoPath;
  }

  async measurePerformance(page) {
    // Collect Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              metrics.FID = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metrics.CLS = (metrics.CLS || 0) + entry.value;
            }
          });

          // Also collect basic timing metrics
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            metrics.FCP = navigation.domContentLoadedEventStart;
            metrics.TTI = navigation.loadEventEnd;
            metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          }

          resolve(metrics);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });

        // Timeout after 5 seconds
        setTimeout(() => resolve({}), 5000);
      });
    });

    return metrics;
  }

  async testAccessibility(page) {
    console.log('🔍 Testing accessibility compliance...');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    if (!focusedElement) {
      await this.logIssue('HIGH', 'Accessibility', 'No keyboard focus indicator', {
        description: 'Page does not have proper keyboard navigation focus indicators',
        location: 'Global navigation',
        reproductionSteps: ['Navigate to page', 'Press Tab key', 'Observe no focus indicator'],
        acceptanceCriteria: 'All interactive elements should have visible focus indicators when navigated with keyboard'
      });
    }

    // Check for proper heading structure
    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headings.map(h => ({
        tag: h.tagName,
        text: h.textContent.trim().substring(0, 50),
        hasProperNesting: true // Simplified check
      }));
    });

    if (headingStructure.length === 0) {
      await this.logIssue('HIGH', 'Accessibility', 'No heading structure found', {
        description: 'Page lacks proper heading hierarchy for screen readers',
        reproductionSteps: ['Navigate to page', 'Check for h1-h6 elements'],
        acceptanceCriteria: 'Page should have proper heading hierarchy starting with h1'
      });
    }

    // Check for alt text on images
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.alt || img.alt.trim() === '').length;
    });

    if (imagesWithoutAlt > 0) {
      await this.logIssue('MEDIUM', 'Accessibility', 'Images without alt text', {
        description: `Found ${imagesWithoutAlt} images without proper alt text`,
        reproductionSteps: ['Navigate to page', 'Inspect img elements', 'Check for missing alt attributes'],
        acceptanceCriteria: 'All images should have descriptive alt text'
      });
    }

    // Check form labels
    const formsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="url"], textarea, select'));
      return inputs.filter(input => {
        const id = input.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        return !label && !ariaLabel && !ariaLabelledBy;
      }).length;
    });

    if (formsWithoutLabels > 0) {
      await this.logIssue('HIGH', 'Accessibility', 'Form inputs without labels', {
        description: `Found ${formsWithoutLabels} form inputs without proper labels`,
        reproductionSteps: ['Navigate to forms', 'Check input elements for labels'],
        acceptanceCriteria: 'All form inputs should have associated labels'
      });
    }

    return {
      focusedElement,
      headingStructure,
      imagesWithoutAlt,
      formsWithoutLabels
    };
  }

  async testResponsiveDesign(page, viewport) {
    console.log(`📱 Testing responsive design for ${viewport}...`);

    await page.setViewportSize(VIEWPORTS[viewport]);
    await page.waitForTimeout(1000); // Wait for responsive changes

    // Check for horizontal scrolling
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll) {
      await this.logIssue('MEDIUM', 'Responsive Design', `Horizontal scrolling on ${viewport}`, {
        description: `Page content extends beyond viewport width on ${viewport} viewport`,
        viewport: VIEWPORTS[viewport],
        reproductionSteps: [`Set viewport to ${VIEWPORTS[viewport].width}x${VIEWPORTS[viewport].height}`, 'Check for horizontal scrollbar'],
        acceptanceCriteria: 'Content should fit within viewport width without horizontal scrolling'
      });
    }

    // Check for overlapping elements
    const overlappingElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      let overlaps = 0;

      // Simplified overlap detection
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          overlaps++;
        }
      });

      return overlaps;
    });

    if (overlappingElements > 0) {
      await this.logIssue('MEDIUM', 'Responsive Design', `Element overflow on ${viewport}`, {
        description: `${overlappingElements} elements extend beyond viewport`,
        viewport: VIEWPORTS[viewport],
        acceptanceCriteria: 'All elements should fit within viewport boundaries'
      });
    }

    // Capture responsive screenshots
    await this.captureScreenshot(page, `responsive-${viewport}`, viewport);
  }

  async testCoreUserFlow(page) {
    console.log('🔄 Testing core user flow...');

    try {
      // Test URL input step
      await page.fill('input[type="url"]', TEST_URLS[0]);
      await this.captureScreenshot(page, 'url-input-filled', 'desktop');

      // Check if submit button is enabled
      const submitButton = page.locator('button[type="submit"]');
      const isEnabled = await submitButton.isEnabled();

      if (!isEnabled) {
        await this.logIssue('MEDIUM', 'Functionality', 'Submit button not enabled with valid URL', {
          description: 'Submit button remains disabled even with valid Amway URL',
          reproductionSteps: ['Enter valid Amway URL', 'Check submit button state'],
          acceptanceCriteria: 'Submit button should be enabled when valid URL is entered'
        });
      }

      // Test form submission
      await submitButton.click();
      await page.waitForTimeout(3000); // Wait for potential API call

      // Check for error messages or loading states
      const errorMessage = await page.locator('[role="alert"]').textContent().catch(() => null);
      const loadingIndicator = await page.locator('[aria-busy="true"]').isVisible().catch(() => false);

      if (errorMessage) {
        await this.logIssue('HIGH', 'Functionality', 'Product extraction fails with test URL', {
          description: `Error encountered: ${errorMessage}`,
          testUrl: TEST_URLS[0],
          reproductionSteps: ['Enter test URL', 'Click submit', 'Observe error message'],
          acceptanceCriteria: 'Test URLs should successfully extract product information'
        });
      }

      if (loadingIndicator) {
        console.log('✅ Loading indicator found - good UX feedback');
      } else {
        await this.logIssue('LOW', 'UX/UI', 'No loading indicator during product extraction', {
          description: 'Users have no feedback during potentially long API operations',
          reproductionSteps: ['Submit URL', 'Observe lack of loading feedback'],
          acceptanceCriteria: 'Loading states should be clearly indicated to users'
        });
      }

    } catch (error) {
      await this.logIssue('CRITICAL', 'Functionality', 'Core user flow completely broken', {
        description: `Critical error in user flow: ${error.message}`,
        stackTrace: error.stack,
        acceptanceCriteria: 'Core user flow must be functional for application to be usable'
      });
    }
  }

  async testErrorHandling(page) {
    console.log('⚠️ Testing error handling...');

    // Test invalid URL
    await page.fill('input[type="url"]', 'https://invalid-url.com');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const errorDisplayed = await page.locator('[role="alert"]').isVisible().catch(() => false);

    if (!errorDisplayed) {
      await this.logIssue('HIGH', 'Error Handling', 'No error message for invalid URL', {
        description: 'Invalid URLs do not display appropriate error messages',
        reproductionSteps: ['Enter invalid URL', 'Submit form', 'Observe lack of error feedback'],
        acceptanceCriteria: 'Invalid URLs should display clear error messages'
      });
    }

    // Test empty form submission
    await page.fill('input[type="url"]', '');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const emptyFormError = await page.locator('[role="alert"]').isVisible().catch(() => false);

    if (!emptyFormError) {
      await this.logIssue('MEDIUM', 'Error Handling', 'No validation for empty form', {
        description: 'Empty form submission does not trigger validation',
        reproductionSteps: ['Clear URL field', 'Submit form', 'Observe lack of validation'],
        acceptanceCriteria: 'Empty form should display validation error'
      });
    }
  }

  async testPerformance(page) {
    console.log('⚡ Analyzing performance metrics...');

    const metrics = await this.measurePerformance(page);
    this.performanceData = metrics;

    // Evaluate Core Web Vitals
    if (metrics.LCP > 2500) {
      await this.logIssue('HIGH', 'Performance', 'Poor Largest Contentful Paint', {
        description: `LCP is ${metrics.LCP}ms, should be under 2.5s`,
        metric: 'LCP',
        value: metrics.LCP,
        threshold: 2500,
        acceptanceCriteria: 'LCP should be under 2.5 seconds for good user experience'
      });
    }

    if (metrics.FID > 100) {
      await this.logIssue('HIGH', 'Performance', 'Poor First Input Delay', {
        description: `FID is ${metrics.FID}ms, should be under 100ms`,
        metric: 'FID',
        value: metrics.FID,
        threshold: 100,
        acceptanceCriteria: 'FID should be under 100ms for responsive interaction'
      });
    }

    if (metrics.CLS > 0.1) {
      await this.logIssue('MEDIUM', 'Performance', 'Poor Cumulative Layout Shift', {
        description: `CLS is ${metrics.CLS}, should be under 0.1`,
        metric: 'CLS',
        value: metrics.CLS,
        threshold: 0.1,
        acceptanceCriteria: 'CLS should be under 0.1 for stable visual experience'
      });
    }
  }

  async analyzeNavigation(page) {
    console.log('🧭 Analyzing navigation and information architecture...');

    // Test main navigation
    const navElements = await page.locator('nav, header a, [role="navigation"]').count();

    if (navElements === 0) {
      await this.logIssue('LOW', 'UX/UI', 'No clear navigation structure', {
        description: 'Page lacks clear navigation elements',
        reproductionSteps: ['Load page', 'Look for navigation elements'],
        acceptanceCriteria: 'Clear navigation should be present'
      });
    }

    // Test breadcrumbs in campaign flow
    const breadcrumbs = await page.locator('[aria-label*="breadcrumb"], .breadcrumb').count();

    // Test back navigation functionality
    const backButtons = await page.locator('button:has-text("Back"), a:has-text("Back")').count();

    if (backButtons === 0) {
      await this.logIssue('MEDIUM', 'UX/UI', 'No back navigation in multi-step flow', {
        description: 'Users cannot navigate back in the campaign creation flow',
        reproductionSteps: ['Start campaign creation', 'Look for back navigation options'],
        acceptanceCriteria: 'Multi-step flows should allow backward navigation'
      });
    }
  }

  async runComprehensiveAnalysis() {
    console.log('🚀 Starting comprehensive UX analysis...');

    await this.initialize();

    // Test all viewport sizes
    for (const viewport of Object.keys(VIEWPORTS)) {
      console.log(`\n📊 Testing ${viewport} viewport...`);

      const context = await this.browser.newContext({
        viewport: VIEWPORTS[viewport],
        recordVideo: {
          dir: path.join(RESULTS_DIR, 'recordings', 'workflows'),
          size: VIEWPORTS[viewport]
        }
      });

      const page = await context.newPage();

      // Enable console logging capture
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`❌ Console Error: ${msg.text()}`);
        }
      });

      // Navigate to application
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Capture initial page screenshot
      await this.captureScreenshot(page, `initial-load`, viewport);

      // Only run full tests on desktop, responsive tests on all viewports
      if (viewport === 'desktop') {
        await this.testAccessibility(page);
        await this.testCoreUserFlow(page);
        await this.testErrorHandling(page);
        await this.testPerformance(page);
        await this.analyzeNavigation(page);
      }

      await this.testResponsiveDesign(page, viewport);

      await context.close();
    }

    await this.cleanup();

    // Generate reports
    await this.generateReports();
  }

  async generateReports() {
    console.log('📝 Generating comprehensive UX analysis reports...');

    // Executive Summary
    const executiveSummary = {
      totalIssues: this.issues.length,
      criticalIssues: this.issues.filter(i => i.severity === 'CRITICAL').length,
      highIssues: this.issues.filter(i => i.severity === 'HIGH').length,
      mediumIssues: this.issues.filter(i => i.severity === 'MEDIUM').length,
      lowIssues: this.issues.filter(i => i.severity === 'LOW').length,
      categories: {
        functionality: this.issues.filter(i => i.category === 'Functionality').length,
        accessibility: this.issues.filter(i => i.category === 'Accessibility').length,
        performance: this.issues.filter(i => i.category === 'Performance').length,
        responsive: this.issues.filter(i => i.category === 'Responsive Design').length,
        ux: this.issues.filter(i => i.category === 'UX/UI').length
      },
      performanceMetrics: this.performanceData
    };

    await fs.writeFile(
      path.join(RESULTS_DIR, 'executive-summary.json'),
      JSON.stringify(executiveSummary, null, 2)
    );

    // Detailed Issues Report
    await fs.writeFile(
      path.join(RESULTS_DIR, 'detailed-issues.json'),
      JSON.stringify(this.issues, null, 2)
    );

    // Performance Data
    await fs.writeFile(
      path.join(RESULTS_DIR, 'performance-data', 'core-web-vitals.json'),
      JSON.stringify(this.performanceData, null, 2)
    );

    // Generate Markdown Report
    await this.generateMarkdownReport();

    console.log(`✅ Analysis complete! Results saved to: ${RESULTS_DIR}`);
    console.log(`📊 Total Issues Found: ${this.issues.length}`);
    console.log(`🚨 Critical: ${executiveSummary.criticalIssues}, High: ${executiveSummary.highIssues}, Medium: ${executiveSummary.mediumIssues}, Low: ${executiveSummary.lowIssues}`);
  }

  async generateMarkdownReport() {
    const critical = this.issues.filter(i => i.severity === 'CRITICAL');
    const high = this.issues.filter(i => i.severity === 'HIGH');
    const medium = this.issues.filter(i => i.severity === 'MEDIUM');
    const low = this.issues.filter(i => i.severity === 'LOW');

    const report = `# Amway IBO Image Campaign Generator - UX Analysis Report

## Executive Summary

**Analysis Date:** ${new Date().toISOString()}
**Application URL:** ${BASE_URL}
**Total Issues Identified:** ${this.issues.length}

### Issue Severity Breakdown
- 🚨 **Critical Issues:** ${critical.length}
- ⚠️ **High Priority Issues:** ${high.length}
- 🔸 **Medium Priority Issues:** ${medium.length}
- 🔹 **Low Priority Issues:** ${low.length}

### Category Breakdown
- **Functionality:** ${this.issues.filter(i => i.category === 'Functionality').length}
- **Accessibility:** ${this.issues.filter(i => i.category === 'Accessibility').length}
- **Performance:** ${this.issues.filter(i => i.category === 'Performance').length}
- **Responsive Design:** ${this.issues.filter(i => i.category === 'Responsive Design').length}
- **UX/UI:** ${this.issues.filter(i => i.category === 'UX/UI').length}
- **Error Handling:** ${this.issues.filter(i => i.category === 'Error Handling').length}

## Performance Metrics

${this.performanceData.LCP ? `- **Largest Contentful Paint (LCP):** ${this.performanceData.LCP}ms ${this.performanceData.LCP > 2500 ? '❌' : '✅'}` : ''}
${this.performanceData.FID ? `- **First Input Delay (FID):** ${this.performanceData.FID}ms ${this.performanceData.FID > 100 ? '❌' : '✅'}` : ''}
${this.performanceData.CLS ? `- **Cumulative Layout Shift (CLS):** ${this.performanceData.CLS} ${this.performanceData.CLS > 0.1 ? '❌' : '✅'}` : ''}
${this.performanceData.pageLoadTime ? `- **Page Load Time:** ${this.performanceData.pageLoadTime}ms` : ''}

## Critical Issues (Immediate Action Required)

${critical.map(issue => `
### ${issue.id}: ${issue.title}

**Category:** ${issue.category}
**Severity:** ${issue.severity}

**Description:** ${issue.description}

**Reproduction Steps:**
${issue.reproductionSteps ? issue.reproductionSteps.map(step => `1. ${step}`).join('\n') : 'Not specified'}

**Acceptance Criteria:** ${issue.acceptanceCriteria}

**Technical Details:**
${issue.testUrl ? `- Test URL: ${issue.testUrl}` : ''}
${issue.viewport ? `- Viewport: ${issue.viewport.width}x${issue.viewport.height}` : ''}
${issue.stackTrace ? `- Stack Trace: \`${issue.stackTrace}\`` : ''}

---
`).join('')}

## High Priority Issues

${high.map(issue => `
### ${issue.id}: ${issue.title}

**Category:** ${issue.category}

**Description:** ${issue.description}

**Impact:** ${issue.description}

**Remediation:** ${issue.acceptanceCriteria}

---
`).join('')}

## Medium Priority Issues

${medium.map(issue => `
### ${issue.id}: ${issue.title}

**Category:** ${issue.category}
**Description:** ${issue.description}

---
`).join('')}

## Low Priority Issues

${low.map(issue => `
### ${issue.id}: ${issue.title}

**Category:** ${issue.category}
**Description:** ${issue.description}

---
`).join('')}

## Recommendations

### Immediate Actions (Critical & High Priority)
1. Fix all critical functionality issues that prevent core user flows
2. Implement proper error handling and user feedback
3. Address accessibility violations for WCAG 2.1 compliance
4. Optimize performance to meet Core Web Vitals thresholds

### Short-term Improvements (Medium Priority)
1. Enhance responsive design for better mobile experience
2. Improve loading states and user feedback
3. Add proper navigation and back functionality

### Long-term Enhancements (Low Priority)
1. Polish UI/UX details for better user experience
2. Add comprehensive navigation structure
3. Implement advanced accessibility features

## Test Evidence

Screenshots and recordings have been captured in the following directories:
- Desktop Screenshots: \`screenshots/desktop/\`
- Tablet Screenshots: \`screenshots/tablet/\`
- Mobile Screenshots: \`screenshots/mobile/\`
- Workflow Recordings: \`recordings/workflows/\`
- Performance Data: \`performance-data/\`

## Next Steps

1. Prioritize critical and high-severity issues for immediate development attention
2. Create detailed development tickets for each identified issue
3. Implement fixes following the provided acceptance criteria
4. Re-test application after fixes are implemented
5. Conduct user acceptance testing with real Amway IBOs

---

*This report was generated by the Comprehensive UX Testing Agent on ${new Date().toISOString()}*
`;

    await fs.writeFile(path.join(RESULTS_DIR, 'UX-Analysis-Report.md'), report);
  }
}

// Run the analysis
const agent = new UXAnalysisAgent();
agent.runComprehensiveAnalysis().catch(console.error);