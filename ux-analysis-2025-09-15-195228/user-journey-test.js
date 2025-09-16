/**
 * Comprehensive User Journey Testing for Amway IBO Image Campaign Generator
 * Tests complete workflows and identifies functional breakdowns
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3003';
const TEST_URLS = [
  'https://www.amway.com/en_US/p/326782',
  'https://www.amway.com/en_US/Nutrilite-Daily-p-100186',
  'https://www.amway.com/en_US/Sleep-%2B-Stress-Solution-p-321893'
];

class UserJourneyTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      testSuite: 'Complete User Journey Validation',
      workflows: [],
      errors: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        critical: 0
      }
    };
  }

  async initialize() {
    console.log('🚀 Starting User Journey Testing...');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/automated testing
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();

    // Enable console logging for debugging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      }
    });

    // Monitor network failures
    this.page.on('requestfailed', request => {
      console.log('❌ Network Request Failed:', request.url(), request.failure().errorText);
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(__dirname, `screenshot-${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  async testApplicationAccessibility() {
    console.log('\n📋 Testing Application Accessibility...');
    const workflow = {
      name: 'Application Accessibility',
      steps: [],
      errors: [],
      status: 'pending'
    };

    try {
      // Test 1: Application loads successfully
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      workflow.steps.push({
        step: 'Navigate to application homepage',
        status: 'passed',
        details: 'Application loaded successfully'
      });

      // Test 2: Check for critical UI elements
      const requiredElements = [
        { selector: 'h1', description: 'Main heading' },
        { selector: '[data-testid="url-input"], input[type="url"]', description: 'URL input field' },
        { selector: 'button[type="submit"], button:contains("Extract")', description: 'Submit button' }
      ];

      for (const element of requiredElements) {
        try {
          await this.page.waitForSelector(element.selector, { timeout: 5000 });
          workflow.steps.push({
            step: `Verify ${element.description} exists`,
            status: 'passed',
            details: `Found element: ${element.selector}`
          });
        } catch (error) {
          workflow.steps.push({
            step: `Verify ${element.description} exists`,
            status: 'failed',
            details: `Missing element: ${element.selector}`,
            error: error.message
          });
          workflow.errors.push({
            type: 'MISSING_UI_ELEMENT',
            severity: 'critical',
            message: `Required UI element missing: ${element.description}`,
            selector: element.selector
          });
        }
      }

      // Test 3: Check mobile responsiveness
      await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await this.page.waitForTimeout(1000);

      const isMobileResponsive = await this.page.evaluate(() => {
        const container = document.querySelector('.container, .mx-auto, [class*="container"]');
        return container ? container.offsetWidth <= 375 : false;
      });

      workflow.steps.push({
        step: 'Test mobile responsiveness',
        status: isMobileResponsive ? 'passed' : 'warning',
        details: `Mobile viewport adaptation: ${isMobileResponsive ? 'responsive' : 'may have issues'}`
      });

      // Reset viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      workflow.status = workflow.errors.length === 0 ? 'passed' : 'failed';

    } catch (error) {
      workflow.status = 'failed';
      workflow.errors.push({
        type: 'APPLICATION_ACCESS_FAILURE',
        severity: 'critical',
        message: 'Failed to access application',
        error: error.message
      });
      await this.takeScreenshot('application-access-failure');
    }

    this.results.workflows.push(workflow);
    this.updateSummary(workflow);
    return workflow;
  }

  async testCompleteUserWorkflow(testUrl = TEST_URLS[0]) {
    console.log(`\n🔄 Testing Complete User Workflow with URL: ${testUrl}`);
    const workflow = {
      name: `Complete Workflow - ${testUrl}`,
      steps: [],
      errors: [],
      status: 'pending'
    };

    try {
      // Step 1: Navigate to campaign creation page
      await this.page.goto(`${BASE_URL}/campaign/new`, { waitUntil: 'networkidle0' });
      workflow.steps.push({
        step: 'Navigate to campaign creation page',
        status: 'passed',
        details: 'Successfully loaded /campaign/new'
      });

      // Step 2: Enter product URL
      const urlInput = await this.page.$('input[type="url"], input[placeholder*="amway"], #product-url');
      if (!urlInput) {
        throw new Error('URL input field not found');
      }

      await urlInput.click({ clickCount: 3 }); // Select all
      await urlInput.type(testUrl);
      workflow.steps.push({
        step: 'Enter product URL',
        status: 'passed',
        details: `Entered URL: ${testUrl}`
      });

      // Step 3: Submit URL for processing
      const submitButton = await this.page.$('button[type="submit"], button:has-text("Extract")');
      if (!submitButton) {
        throw new Error('Submit button not found');
      }

      // Wait for button to be enabled (real-time validation)
      await this.page.waitForFunction(
        (btn) => !btn.disabled,
        { timeout: 10000 },
        submitButton
      );

      await submitButton.click();
      workflow.steps.push({
        step: 'Submit URL for processing',
        status: 'passed',
        details: 'Clicked submit button'
      });

      // Step 4: Wait for product extraction to complete
      try {
        await this.page.waitForSelector('[data-testid="product-preview"], .product-preview, h2:has-text("Product Information")',
          { timeout: 60000 }
        );
        workflow.steps.push({
          step: 'Product extraction completed',
          status: 'passed',
          details: 'Product information successfully extracted and displayed'
        });
      } catch (error) {
        // Check for error messages
        const errorElement = await this.page.$('.text-red-600, [role="alert"], .error');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          workflow.steps.push({
            step: 'Product extraction completed',
            status: 'failed',
            details: `Extraction failed with error: ${errorText}`,
            error: errorText
          });
          workflow.errors.push({
            type: 'PRODUCT_EXTRACTION_FAILURE',
            severity: 'critical',
            message: `Product scraping failed: ${errorText}`,
            url: testUrl
          });
          throw new Error(`Product extraction failed: ${errorText}`);
        }
        throw error;
      }

      // Step 5: Verify product information display
      const productElements = {
        name: await this.page.$('h3, .product-name, [data-testid="product-name"]'),
        image: await this.page.$('img[alt], .product-image'),
        category: await this.page.$('.badge, .category, [data-testid="category"]'),
        description: await this.page.$('p:has-text("Description"), .description')
      };

      const missingElements = Object.entries(productElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

      if (missingElements.length > 0) {
        workflow.errors.push({
          type: 'INCOMPLETE_PRODUCT_DATA',
          severity: 'high',
          message: `Missing product elements: ${missingElements.join(', ')}`,
          missingElements
        });
      }

      workflow.steps.push({
        step: 'Verify product information display',
        status: missingElements.length === 0 ? 'passed' : 'warning',
        details: `Product elements found: ${Object.keys(productElements).length - missingElements.length}/4`
      });

      // Step 6: Configure campaign preferences
      const configureButton = await this.page.$('button:has-text("Configure"), button:has-text("Next"), button:has-text("Continue")');
      if (configureButton) {
        await configureButton.click();
        workflow.steps.push({
          step: 'Navigate to campaign configuration',
          status: 'passed',
          details: 'Clicked configure/continue button'
        });
      } else {
        // Check if already on configuration step
        const preferencesPanel = await this.page.$('[data-testid="preferences-panel"], .preferences, h2:has-text("Campaign Preferences")');
        if (!preferencesPanel) {
          workflow.errors.push({
            type: 'NAVIGATION_FAILURE',
            severity: 'critical',
            message: 'Cannot navigate to campaign configuration step',
            details: 'No configure button or preferences panel found'
          });
          throw new Error('Cannot proceed to campaign configuration');
        }
      }

      // Wait for preferences panel to load
      await this.page.waitForSelector('[data-testid="preferences-panel"], .preferences-panel, select, input[type="radio"]',
        { timeout: 10000 }
      );

      // Step 7: Set campaign preferences (use defaults or modify)
      const preferenceInputs = await this.page.$$('select, input[type="radio"], input[type="checkbox"]');
      if (preferenceInputs.length > 0) {
        workflow.steps.push({
          step: 'Campaign preferences loaded',
          status: 'passed',
          details: `Found ${preferenceInputs.length} preference inputs`
        });
      } else {
        workflow.errors.push({
          type: 'MISSING_PREFERENCES_UI',
          severity: 'high',
          message: 'No preference input elements found',
          details: 'Cannot configure campaign without preference controls'
        });
      }

      // Step 8: Start generation
      const generateButton = await this.page.$('button:has-text("Generate"), button:has-text("Create"), button:has-text("Start")');
      if (!generateButton) {
        throw new Error('Generate button not found');
      }

      await generateButton.click();
      workflow.steps.push({
        step: 'Start campaign generation',
        status: 'passed',
        details: 'Clicked generate button'
      });

      // Step 9: Monitor generation progress
      try {
        await this.page.waitForSelector('.progress, [role="progressbar"], .generating', { timeout: 10000 });
        workflow.steps.push({
          step: 'Generation progress initiated',
          status: 'passed',
          details: 'Progress indicator appeared'
        });

        // Wait for generation to complete (with extended timeout)
        await this.page.waitForSelector(
          '.completed, .success, button:has-text("Download"), h2:has-text("Campaign"), .campaign-summary',
          { timeout: 180000 } // 3 minutes for AI generation
        );

        workflow.steps.push({
          step: 'Campaign generation completed',
          status: 'passed',
          details: 'Generation finished successfully'
        });

      } catch (error) {
        // Check for generation errors
        const errorElement = await this.page.$('.error, .failed, .text-red-600, [role="alert"]');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          workflow.errors.push({
            type: 'GENERATION_FAILURE',
            severity: 'critical',
            message: `AI generation failed: ${errorText}`,
            details: 'Campaign generation process failed'
          });
        }
        throw new Error('Generation timeout or failure');
      }

      // Step 10: Test download functionality
      const downloadButton = await this.page.$('button:has-text("Download"), a:has-text("Download"), .download');
      if (downloadButton) {
        // Set up download monitoring
        const downloadPromise = new Promise((resolve) => {
          this.page.on('response', response => {
            if (response.url().includes('download') && response.status() === 200) {
              resolve(response);
            }
          });
        });

        await downloadButton.click();

        try {
          await Promise.race([downloadPromise, new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Download timeout')), 30000)
          )]);

          workflow.steps.push({
            step: 'Campaign download initiated',
            status: 'passed',
            details: 'Download started successfully'
          });
        } catch (error) {
          workflow.steps.push({
            step: 'Campaign download initiated',
            status: 'failed',
            details: 'Download failed or timed out',
            error: error.message
          });
          workflow.errors.push({
            type: 'DOWNLOAD_FAILURE',
            severity: 'high',
            message: 'Campaign download failed',
            details: error.message
          });
        }
      } else {
        workflow.errors.push({
          type: 'MISSING_DOWNLOAD_OPTION',
          severity: 'critical',
          message: 'No download button found after successful generation',
          details: 'Users cannot access their generated campaign'
        });
      }

      workflow.status = workflow.errors.filter(e => e.severity === 'critical').length === 0 ? 'passed' : 'failed';

    } catch (error) {
      workflow.status = 'failed';
      workflow.errors.push({
        type: 'WORKFLOW_FAILURE',
        severity: 'critical',
        message: 'Complete workflow failed',
        error: error.message,
        step: workflow.steps.length
      });
      await this.takeScreenshot('workflow-failure');
    }

    this.results.workflows.push(workflow);
    this.updateSummary(workflow);
    return workflow;
  }

  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    const workflow = {
      name: 'Error Handling Validation',
      steps: [],
      errors: [],
      status: 'pending'
    };

    const errorTests = [
      {
        name: 'Invalid URL',
        url: 'https://invalid-url-test.com/product',
        expectedError: 'Please enter a valid Amway product URL'
      },
      {
        name: 'Non-Amway URL',
        url: 'https://www.amazon.com/product/12345',
        expectedError: 'valid Amway product URL'
      },
      {
        name: 'Malformed URL',
        url: 'not-a-url-at-all',
        expectedError: 'valid'
      }
    ];

    try {
      await this.page.goto(`${BASE_URL}/campaign/new`, { waitUntil: 'networkidle0' });

      for (const test of errorTests) {
        try {
          // Clear and enter test URL
          const urlInput = await this.page.$('input[type="url"], #product-url');
          await urlInput.click({ clickCount: 3 });
          await urlInput.type(test.url);

          // Try to submit
          const submitButton = await this.page.$('button[type="submit"]');
          await submitButton.click();

          // Wait for error message
          await this.page.waitForSelector('.text-red-600, [role="alert"], .error', { timeout: 5000 });

          const errorElement = await this.page.$('.text-red-600, [role="alert"], .error');
          const errorText = await errorElement.textContent();

          if (errorText.toLowerCase().includes(test.expectedError.toLowerCase())) {
            workflow.steps.push({
              step: `Error handling for ${test.name}`,
              status: 'passed',
              details: `Correct error shown: ${errorText}`
            });
          } else {
            workflow.steps.push({
              step: `Error handling for ${test.name}`,
              status: 'failed',
              details: `Expected error containing "${test.expectedError}", got: ${errorText}`
            });
            workflow.errors.push({
              type: 'INCORRECT_ERROR_MESSAGE',
              severity: 'medium',
              message: `Incorrect error message for ${test.name}`,
              expected: test.expectedError,
              actual: errorText
            });
          }

        } catch (error) {
          workflow.steps.push({
            step: `Error handling for ${test.name}`,
            status: 'failed',
            details: `No error message shown for invalid input`,
            error: error.message
          });
          workflow.errors.push({
            type: 'MISSING_ERROR_HANDLING',
            severity: 'high',
            message: `No error handling for ${test.name}`,
            testUrl: test.url
          });
        }
      }

      workflow.status = workflow.errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0 ? 'passed' : 'failed';

    } catch (error) {
      workflow.status = 'failed';
      workflow.errors.push({
        type: 'ERROR_TESTING_FAILURE',
        severity: 'critical',
        message: 'Failed to test error handling',
        error: error.message
      });
    }

    this.results.workflows.push(workflow);
    this.updateSummary(workflow);
    return workflow;
  }

  async testNavigationFlow() {
    console.log('\n🧭 Testing Navigation Flow...');
    const workflow = {
      name: 'Navigation Flow Validation',
      steps: [],
      errors: [],
      status: 'pending'
    };

    try {
      // Test navigation between different steps
      await this.page.goto(`${BASE_URL}/campaign/new`, { waitUntil: 'networkidle0' });

      // Check if progress indicator exists
      const progressIndicator = await this.page.$('.progress-indicator, .stepper, .step');
      if (progressIndicator) {
        workflow.steps.push({
          step: 'Progress indicator found',
          status: 'passed',
          details: 'User can track workflow progress'
        });
      } else {
        workflow.errors.push({
          type: 'MISSING_PROGRESS_INDICATOR',
          severity: 'medium',
          message: 'No progress indicator found',
          details: 'Users cannot track their progress through the workflow'
        });
      }

      // Test back navigation (if available)
      const backButton = await this.page.$('button:has-text("Back"), button:has-text("Previous"), .back');
      if (backButton) {
        workflow.steps.push({
          step: 'Back navigation available',
          status: 'passed',
          details: 'Users can navigate backwards'
        });
      } else {
        workflow.errors.push({
          type: 'MISSING_BACK_NAVIGATION',
          severity: 'medium',
          message: 'No back navigation found',
          details: 'Users cannot return to previous steps'
        });
      }

      // Test browser back button behavior
      await this.page.goBack();
      await this.page.waitForTimeout(1000);

      const currentUrl = this.page.url();
      if (currentUrl !== `${BASE_URL}/campaign/new`) {
        workflow.steps.push({
          step: 'Browser back button handling',
          status: 'passed',
          details: 'Browser navigation works correctly'
        });
      } else {
        workflow.errors.push({
          type: 'BROWSER_NAVIGATION_ISSUE',
          severity: 'medium',
          message: 'Browser back button may not work as expected',
          currentUrl
        });
      }

      workflow.status = workflow.errors.filter(e => e.severity === 'critical').length === 0 ? 'passed' : 'warning';

    } catch (error) {
      workflow.status = 'failed';
      workflow.errors.push({
        type: 'NAVIGATION_TESTING_FAILURE',
        severity: 'high',
        message: 'Failed to test navigation flow',
        error: error.message
      });
    }

    this.results.workflows.push(workflow);
    this.updateSummary(workflow);
    return workflow;
  }

  updateSummary(workflow) {
    this.results.summary.totalTests++;
    if (workflow.status === 'passed') {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }

    const criticalErrors = workflow.errors.filter(e => e.severity === 'critical').length;
    this.results.summary.critical += criticalErrors;
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Report...');

    // Calculate success rate
    const successRate = this.results.summary.totalTests > 0
      ? Math.round((this.results.summary.passed / this.results.summary.totalTests) * 100)
      : 0;

    // Categorize all errors
    const errorsByType = {};
    const errorsBySeverity = { critical: [], high: [], medium: [], low: [] };

    this.results.workflows.forEach(workflow => {
      workflow.errors.forEach(error => {
        if (!errorsByType[error.type]) {
          errorsByType[error.type] = [];
        }
        errorsByType[error.type].push(error);
        errorsBySeverity[error.severity].push(error);
      });
    });

    const report = {
      executiveSummary: {
        testDate: this.results.timestamp,
        applicationUrl: BASE_URL,
        successRate: `${successRate}%`,
        totalWorkflows: this.results.summary.totalTests,
        passedWorkflows: this.results.summary.passed,
        failedWorkflows: this.results.summary.failed,
        criticalIssues: this.results.summary.critical,
        overallStatus: this.results.summary.critical === 0 ? 'STABLE' : 'CRITICAL_ISSUES_FOUND'
      },
      userJourneyValidation: {
        coreWorkflowStatus: this.results.workflows.find(w => w.name.includes('Complete Workflow'))?.status || 'NOT_TESTED',
        navigationStatus: this.results.workflows.find(w => w.name.includes('Navigation'))?.status || 'NOT_TESTED',
        errorHandlingStatus: this.results.workflows.find(w => w.name.includes('Error Handling'))?.status || 'NOT_TESTED',
        accessibilityStatus: this.results.workflows.find(w => w.name.includes('Accessibility'))?.status || 'NOT_TESTED'
      },
      criticalPathwayIssues: errorsBySeverity.critical.map(error => ({
        userGoal: this.getUserGoalFromError(error),
        severity: 'Critical',
        blocking: error.message,
        userStory: this.generateUserStory(error),
        brokenWorkflow: this.getBrokenWorkflow(error),
        rootCause: error.details || error.message,
        functionalGap: this.getFunctionalGap(error),
        remediation: this.generateRemediation(error)
      })),
      detailedFindings: this.results.workflows,
      implementationRoadmap: this.generateImplementationRoadmap(errorsBySeverity),
      testMetadata: {
        testUrls: TEST_URLS,
        testDuration: 'Approximately 10-15 minutes per complete workflow',
        testEnvironment: 'Local development server',
        browserUsed: 'Chromium (Puppeteer)'
      }
    };

    // Save detailed report
    const reportPath = path.join(__dirname, 'user-journey-analysis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(__dirname, 'user-journey-summary.md');
    await fs.writeFile(markdownPath, markdownReport);

    console.log(`\n✅ Reports generated:`);
    console.log(`📄 Detailed JSON: ${reportPath}`);
    console.log(`📋 Summary Markdown: ${markdownPath}`);

    return report;
  }

  getUserGoalFromError(error) {
    const goalMap = {
      'PRODUCT_EXTRACTION_FAILURE': 'User cannot extract product information from Amway URLs',
      'GENERATION_FAILURE': 'User cannot generate marketing images for their products',
      'DOWNLOAD_FAILURE': 'User cannot download their completed campaign',
      'NAVIGATION_FAILURE': 'User gets stuck and cannot proceed through the workflow',
      'MISSING_UI_ELEMENT': 'User cannot interact with essential application features',
      'APPLICATION_ACCESS_FAILURE': 'User cannot access the application at all'
    };
    return goalMap[error.type] || 'User workflow completion blocked';
  }

  generateUserStory(error) {
    return `As an Amway IBO, I want to ${this.getUserGoalFromError(error).toLowerCase()}, so that I can create professional marketing materials for my business.`;
  }

  getBrokenWorkflow(error) {
    const workflowMap = {
      'PRODUCT_EXTRACTION_FAILURE': [
        '1. User enters valid Amway product URL',
        '2. User clicks "Extract Product Information"',
        '3. FAILURE: System cannot scrape product data',
        '4. User is stuck - cannot proceed to campaign creation'
      ],
      'GENERATION_FAILURE': [
        '1. User successfully configures campaign preferences',
        '2. User clicks "Generate Campaign"',
        '3. FAILURE: AI generation fails or times out',
        '4. User cannot complete their intended workflow'
      ],
      'DOWNLOAD_FAILURE': [
        '1. User completes entire generation process',
        '2. Campaign shows as completed',
        '3. FAILURE: Download button missing or non-functional',
        '4. User cannot access their generated campaign'
      ]
    };
    return workflowMap[error.type] || [
      '1. User attempts to complete workflow',
      '2. FAILURE: Specific breakdown point',
      '3. User cannot proceed or complete task'
    ];
  }

  getFunctionalGap(error) {
    const gapMap = {
      'PRODUCT_EXTRACTION_FAILURE': 'Missing robust web scraping functionality or error handling',
      'GENERATION_FAILURE': 'Missing AI service integration or timeout handling',
      'DOWNLOAD_FAILURE': 'Missing download endpoint or file generation',
      'NAVIGATION_FAILURE': 'Missing navigation state management',
      'MISSING_UI_ELEMENT': 'Missing critical user interface components'
    };
    return gapMap[error.type] || 'Unidentified functional gap in user workflow';
  }

  generateRemediation(error) {
    const remediationMap = {
      'PRODUCT_EXTRACTION_FAILURE': {
        missingComponent: 'Robust web scraping service with retry logic',
        navigationFix: 'Add clear error recovery path from scraping failures',
        stateManagement: 'Implement URL validation and caching',
        businessLogic: 'Add fallback mechanisms for scraping failures',
        implementationPriority: 'Critical - blocks primary user workflow'
      },
      'GENERATION_FAILURE': {
        missingComponent: 'Reliable AI service integration with proper error handling',
        navigationFix: 'Add retry mechanisms and progress indicators',
        stateManagement: 'Preserve user preferences during failures',
        businessLogic: 'Implement graceful degradation for AI failures',
        implementationPriority: 'Critical - prevents users from completing core functionality'
      },
      'DOWNLOAD_FAILURE': {
        missingComponent: 'Complete download workflow and file serving',
        navigationFix: 'Ensure download access from multiple points',
        stateManagement: 'Track download availability and expiration',
        businessLogic: 'Implement secure file access and cleanup',
        implementationPriority: 'High - users cannot access completed work'
      }
    };
    return remediationMap[error.type] || {
      missingComponent: 'Undefined component needs',
      implementationPriority: 'Requires analysis'
    };
  }

  generateImplementationRoadmap(errorsBySeverity) {
    return {
      phase1_critical: {
        title: 'Critical Pathway Fixes (Week 1)',
        items: errorsBySeverity.critical.map(e => ({
          issue: e.message,
          priority: 'Immediate',
          blocksUserGoals: true
        }))
      },
      phase2_high: {
        title: 'High Priority Improvements (Week 2-3)',
        items: errorsBySeverity.high.map(e => ({
          issue: e.message,
          priority: 'High',
          improveUserExperience: true
        }))
      },
      phase3_enhancements: {
        title: 'User Experience Enhancements (Week 4+)',
        items: errorsBySeverity.medium.concat(errorsBySeverity.low).map(e => ({
          issue: e.message,
          priority: 'Enhancement',
          polishAndOptimization: true
        }))
      }
    };
  }

  generateMarkdownReport(report) {
    return `# User Journey Analysis Report

## Executive Summary
- **Test Date**: ${report.executiveSummary.testDate}
- **Application URL**: ${report.executiveSummary.applicationUrl}
- **Overall Status**: ${report.executiveSummary.overallStatus}
- **Success Rate**: ${report.executiveSummary.successRate}
- **Critical Issues**: ${report.executiveSummary.criticalIssues}

## Workflow Validation Results
- **Core Workflow**: ${report.userJourneyValidation.coreWorkflowStatus}
- **Navigation**: ${report.userJourneyValidation.navigationStatus}
- **Error Handling**: ${report.userJourneyValidation.errorHandlingStatus}
- **Accessibility**: ${report.userJourneyValidation.accessibilityStatus}

## Critical Pathway Issues
${report.criticalPathwayIssues.map(issue => `
### ${issue.userGoal}
**Severity**: ${issue.severity}
**Blocking**: ${issue.blocking}

**User Story**: ${issue.userStory}

**Broken Workflow**:
${issue.brokenWorkflow.map(step => `- ${step}`).join('\n')}

**Root Cause**: ${issue.rootCause}
**Functional Gap**: ${issue.functionalGap}

**Remediation Required**:
- Missing Component: ${issue.remediation.missingComponent}
- Implementation Priority: ${issue.remediation.implementationPriority}
`).join('\n')}

## Implementation Roadmap
${Object.entries(report.implementationRoadmap).map(([phase, data]) => `
### ${data.title}
${data.items.map(item => `- ${item.issue} (${item.priority})`).join('\n')}
`).join('\n')}

## Test Coverage
- **Test URLs Used**: ${report.testMetadata.testUrls.length} verified Amway product URLs
- **Test Duration**: ${report.testMetadata.testDuration}
- **Environment**: ${report.testMetadata.testEnvironment}
`;
  }

  async runAllTests() {
    try {
      await this.initialize();

      console.log('🎯 Running Comprehensive User Journey Tests...\n');

      // Test 1: Application Accessibility
      await this.testApplicationAccessibility();

      // Test 2: Complete User Workflow (with first test URL)
      await this.testCompleteUserWorkflow(TEST_URLS[0]);

      // Test 3: Error Handling
      await this.testErrorHandling();

      // Test 4: Navigation Flow
      await this.testNavigationFlow();

      // Test 5: Additional workflow tests with other URLs (if first succeeded)
      const firstWorkflow = this.results.workflows.find(w => w.name.includes('Complete Workflow'));
      if (firstWorkflow && firstWorkflow.status === 'passed') {
        console.log('\n🔄 Testing additional URLs for consistency...');
        for (let i = 1; i < TEST_URLS.length; i++) {
          await this.testCompleteUserWorkflow(TEST_URLS[i]);
        }
      }

      // Generate comprehensive report
      const report = await this.generateReport();

      console.log('\n🎉 User Journey Testing Complete!');
      console.log(`\n📊 Summary:`);
      console.log(`- Total Tests: ${this.results.summary.totalTests}`);
      console.log(`- Passed: ${this.results.summary.passed}`);
      console.log(`- Failed: ${this.results.summary.failed}`);
      console.log(`- Critical Issues: ${this.results.summary.critical}`);
      console.log(`- Overall Status: ${report.executiveSummary.overallStatus}`);

      return report;

    } catch (error) {
      console.error('❌ Testing framework error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const tester = new UserJourneyTester();
  tester.runAllTests().catch(console.error);
}

module.exports = UserJourneyTester;