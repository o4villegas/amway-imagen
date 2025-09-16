#!/usr/bin/env node

/**
 * Source Code Analysis for Amway IBO Image Campaign Generator
 * Focuses only on actual source files, not build artifacts
 */

const fs = require('fs');
const path = require('path');

class SourceCodeAnalyzer {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
  }

  addFinding(severity, category, title, description, details = {}) {
    this.findings[severity].push({
      title,
      description,
      category,
      details,
      timestamp: new Date().toISOString()
    });
    console.log(`[${severity.toUpperCase()}] ${category}: ${title}`);
  }

  async analyzeSourceFiles() {
    const sourceFiles = [
      '/home/lando555/amway-imagen/app/api/scrape/route.ts',
      '/home/lando555/amway-imagen/app/api/campaign/generate/route.ts',
      '/home/lando555/amway-imagen/app/api/campaign/download/[...key]/route.ts',
      '/home/lando555/amway-imagen/lib/scraper.ts',
      '/home/lando555/amway-imagen/lib/prompt-generator.ts',
      '/home/lando555/amway-imagen/lib/db.ts',
      '/home/lando555/amway-imagen/lib/zip-creator.ts',
      '/home/lando555/amway-imagen/lib/rate-limiter.ts',
      '/home/lando555/amway-imagen/app/campaign/new/page.tsx',
      '/home/lando555/amway-imagen/components/campaign/URLInput.tsx',
      '/home/lando555/amway-imagen/components/campaign/ProductPreview.tsx',
      '/home/lando555/amway-imagen/components/campaign/PreferencesPanel.tsx'
    ];

    for (const filePath of sourceFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.analyzeFile(filePath, content);
      } else {
        this.addFinding('medium', 'missing-file', 'Missing Source File',
          `Expected source file not found: ${filePath}`, { filePath });
      }
    }
  }

  analyzeFile(filePath, content) {
    const filename = path.basename(filePath);

    // API Route Analysis
    if (filePath.includes('/api/')) {
      this.analyzeAPIRoute(filePath, content, filename);
    }

    // Library Analysis
    if (filePath.includes('/lib/')) {
      this.analyzeLibraryFile(filePath, content, filename);
    }

    // Component Analysis
    if (filePath.includes('/components/')) {
      this.analyzeComponent(filePath, content, filename);
    }

    // General Code Quality
    this.analyzeCodeQuality(filePath, content, filename);
  }

  analyzeAPIRoute(filePath, content, filename) {
    // Check for proper error handling
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    if (!hasErrorHandling) {
      this.addFinding('high', 'error-handling', 'Missing Error Handling',
        `API route ${filename} lacks comprehensive error handling`, { filePath });
    }

    // Check for rate limiting
    const hasRateLimit = content.includes('rateLimiters') || content.includes('rateLimit');
    if (!hasRateLimit) {
      this.addFinding('medium', 'security', 'Missing Rate Limiting',
        `API route ${filename} should implement rate limiting`, { filePath });
    }

    // Check for input validation
    const hasValidation = content.includes('validate') || content.includes('schema') ||
                         content.includes('typeof') || content.includes('instanceof');
    if (!hasValidation && content.includes('request.json()')) {
      this.addFinding('high', 'security', 'Insufficient Input Validation',
        `API route ${filename} may lack proper input validation`, { filePath });
    }

    // Check for SQL injection protection
    if (content.includes('prepare(') && content.includes('${')) {
      this.addFinding('critical', 'security', 'SQL Injection Risk',
        `API route ${filename} uses string interpolation with SQL prepare statements`, { filePath });
    }

    // Check for sensitive data logging
    if (content.includes('console.log') &&
        (content.toLowerCase().includes('password') ||
         content.toLowerCase().includes('token') ||
         content.toLowerCase().includes('key'))) {
      this.addFinding('high', 'security', 'Sensitive Data in Logs',
        `API route ${filename} may log sensitive information`, { filePath });
    }

    // Check for timeout handling
    if (filePath.includes('generate') && !content.includes('timeout')) {
      this.addFinding('medium', 'reliability', 'Missing Timeout Handling',
        `Generation API should implement timeout handling for long operations`, { filePath });
    }
  }

  analyzeLibraryFile(filePath, content, filename) {
    // Scraper analysis
    if (filename === 'scraper.ts') {
      this.analyzeScraper(filePath, content);
    }

    // Prompt generator analysis
    if (filename === 'prompt-generator.ts') {
      this.analyzePromptGenerator(filePath, content);
    }

    // Database analysis
    if (filename === 'db.ts') {
      this.analyzeDatabase(filePath, content);
    }

    // Rate limiter analysis
    if (filename === 'rate-limiter.ts') {
      this.analyzeRateLimiter(filePath, content);
    }
  }

  analyzeScraper(filePath, content) {
    // Check for user agent rotation
    if (!content.includes('User-Agent') || content.match(/User-Agent.*Mozilla/g)?.length === 1) {
      this.addFinding('low', 'scraping', 'Static User Agent',
        'Scraper uses static user agent which may be easily blocked', { filePath });
    }

    // Check for retry logic
    if (!content.includes('retry') && !content.includes('attempt')) {
      this.addFinding('medium', 'reliability', 'Missing Retry Logic',
        'Scraper should implement retry logic for failed requests', { filePath });
    }

    // Check for timeout implementation
    const hasTimeout = content.includes('timeout') || content.includes('AbortController');
    if (!hasTimeout) {
      this.addFinding('medium', 'reliability', 'Missing Request Timeout',
        'Scraper should implement request timeouts', { filePath });
    }

    // Check for robust parsing
    if (content.includes('JSON.parse') && !content.includes('try')) {
      this.addFinding('medium', 'error-handling', 'Unsafe JSON Parsing',
        'JSON.parse calls should be wrapped in try-catch blocks', { filePath });
    }
  }

  analyzePromptGenerator(filePath, content) {
    // Check for prompt injection protection
    if (!content.includes('sanitize') && !content.includes('escape')) {
      this.addFinding('medium', 'security', 'Potential Prompt Injection',
        'Prompt generator should sanitize user inputs to prevent prompt injection', { filePath });
    }

    // Check for prompt diversity
    const promptVariations = content.match(/variations\[/g)?.length || 0;
    if (promptVariations < 3) {
      this.addFinding('low', 'quality', 'Limited Prompt Diversity',
        'Consider adding more prompt variations for better image diversity', { filePath });
    }

    // Check for compliance handling
    if (!content.includes('COMPLIANCE') && !content.includes('disclaimer')) {
      this.addFinding('high', 'compliance', 'Missing Compliance Disclaimers',
        'Prompt generator should include compliance disclaimers for regulated products', { filePath });
    }
  }

  analyzeDatabase(filePath, content) {
    // Check for SQL injection protection
    if (content.includes('prepare(') && content.includes('${')) {
      this.addFinding('critical', 'security', 'SQL Injection Vulnerability',
        'Database queries use string interpolation which enables SQL injection', { filePath });
    }

    // Check for connection pooling/management
    if (!content.includes('pool') && content.includes('connection')) {
      this.addFinding('medium', 'performance', 'Missing Connection Pooling',
        'Database should implement connection pooling for better performance', { filePath });
    }

    // Check for transaction support
    if (!content.includes('transaction') && content.includes('INSERT') && content.includes('UPDATE')) {
      this.addFinding('medium', 'reliability', 'Missing Transaction Support',
        'Complex database operations should use transactions', { filePath });
    }

    // Check for proper error handling
    if (!content.includes('catch') || !content.includes('throw')) {
      this.addFinding('high', 'error-handling', 'Insufficient Database Error Handling',
        'Database operations need comprehensive error handling', { filePath });
    }
  }

  analyzeRateLimiter(filePath, content) {
    // Check for distributed rate limiting
    if (!content.includes('distributed') && !content.includes('redis')) {
      this.addFinding('medium', 'scalability', 'In-Memory Rate Limiting',
        'Rate limiter uses in-memory storage which won\'t work across multiple instances', { filePath });
    }

    // Check for configurable limits
    if (!content.includes('config') && content.includes('const')) {
      this.addFinding('low', 'configuration', 'Hardcoded Rate Limits',
        'Rate limits should be configurable via environment variables', { filePath });
    }
  }

  analyzeComponent(filePath, content, filename) {
    // Check for proper error boundaries
    if (content.includes('useEffect') && !content.includes('catch') && !content.includes('Error')) {
      this.addFinding('medium', 'error-handling', 'Missing Error Boundary',
        `Component ${filename} should implement error boundaries for useEffect calls`, { filePath });
    }

    // Check for accessibility
    if (!content.includes('aria-') && !content.includes('role=') &&
        (content.includes('button') || content.includes('input'))) {
      this.addFinding('medium', 'accessibility', 'Missing ARIA Attributes',
        `Component ${filename} should include ARIA attributes for accessibility`, { filePath });
    }

    // Check for proper form validation
    if (content.includes('input') && !content.includes('required') && !content.includes('validation')) {
      this.addFinding('medium', 'ux', 'Missing Form Validation',
        `Component ${filename} should implement client-side validation`, { filePath });
    }

    // Check for loading states
    if (content.includes('fetch') && !content.includes('loading') && !content.includes('isLoading')) {
      this.addFinding('low', 'ux', 'Missing Loading States',
        `Component ${filename} should show loading states during async operations`, { filePath });
    }

    // Check for key props in lists
    if (content.includes('.map(') && !content.includes('key=')) {
      this.addFinding('medium', 'react', 'Missing Key Props',
        `Component ${filename} uses .map() without key props`, { filePath });
    }
  }

  analyzeCodeQuality(filePath, content, filename) {
    // Check for proper TypeScript usage
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      if (content.includes(': any') || content.includes('as any')) {
        this.addFinding('low', 'typescript', 'Loose TypeScript Types',
          `File ${filename} uses 'any' types which reduce type safety`, { filePath });
      }
    }

    // Check for console.log statements
    const consoleLogs = (content.match(/console\.log/g) || []).length;
    if (consoleLogs > 2 && !filePath.includes('test')) {
      this.addFinding('low', 'code-quality', 'Debug Console Statements',
        `File ${filename} contains ${consoleLogs} console.log statements`, { filePath, count: consoleLogs });
    }

    // Check for TODO comments
    const todos = (content.match(/TODO|FIXME|XXX/gi) || []).length;
    if (todos > 3) {
      this.addFinding('low', 'code-quality', 'Many TODO Comments',
        `File ${filename} has ${todos} TODO/FIXME comments`, { filePath, count: todos });
    }

    // Check for magic numbers
    const magicNumbers = content.match(/\b(?!0|1|2|10|100|1000)\d{3,}\b/g) || [];
    if (magicNumbers.length > 3) {
      this.addFinding('low', 'code-quality', 'Magic Numbers',
        `File ${filename} contains magic numbers that should be constants`, { filePath, numbers: magicNumbers.slice(0, 5) });
    }

    // Check for long functions (simple heuristic)
    const functions = content.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/g) || [];
    const avgLinesPerFunction = content.split('\n').length / Math.max(functions.length, 1);
    if (avgLinesPerFunction > 50) {
      this.addFinding('medium', 'code-quality', 'Long Functions',
        `File ${filename} may contain functions that are too long (avg ${Math.round(avgLinesPerFunction)} lines)`,
        { filePath, avgLines: Math.round(avgLinesPerFunction) });
    }
  }

  generateReport() {
    const totalFindings = Object.values(this.findings).flat().length;

    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalFindings,
        criticalIssues: this.findings.critical.length,
        highIssues: this.findings.high.length,
        mediumIssues: this.findings.medium.length,
        lowIssues: this.findings.low.length
      },
      findings: this.findings,
      recommendations: this.generateRecommendations()
    };

    console.log('\n=== SOURCE CODE ANALYSIS REPORT ===');
    console.log(`Total Findings: ${totalFindings}`);
    console.log(`Critical: ${this.findings.critical.length}`);
    console.log(`High: ${this.findings.high.length}`);
    console.log(`Medium: ${this.findings.medium.length}`);
    console.log(`Low: ${this.findings.low.length}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.findings.critical.length > 0) {
      recommendations.push({
        priority: 'immediate',
        category: 'security',
        action: 'Fix critical security vulnerabilities',
        details: 'Address SQL injection risks and other critical security issues immediately'
      });
    }

    if (this.findings.high.filter(f => f.category === 'security').length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        action: 'Implement comprehensive input validation',
        details: 'Add proper validation, sanitization, and error handling to all API endpoints'
      });
    }

    if (this.findings.medium.filter(f => f.category === 'accessibility').length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'accessibility',
        action: 'Improve accessibility compliance',
        details: 'Add ARIA attributes, proper form labels, and keyboard navigation support'
      });
    }

    if (this.findings.medium.filter(f => f.category === 'reliability').length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'reliability',
        action: 'Enhance error handling and resilience',
        details: 'Implement retry logic, timeouts, and better error recovery mechanisms'
      });
    }

    return recommendations;
  }

  async run() {
    console.log('Starting source code analysis...');
    await this.analyzeSourceFiles();
    return this.generateReport();
  }
}

// Run the analyzer
async function main() {
  const analyzer = new SourceCodeAnalyzer();

  try {
    const report = await analyzer.run();

    // Write detailed report
    fs.writeFileSync('/home/lando555/amway-imagen/source-code-analysis-report.json',
                     JSON.stringify(report, null, 2));

    console.log('\nDetailed report saved to: source-code-analysis-report.json');

  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = { SourceCodeAnalyzer };
}