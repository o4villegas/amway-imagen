#!/usr/bin/env node

/**
 * Static Code Analysis for Amway IBO Image Campaign Generator
 * Analyzes code quality, security vulnerabilities, and performance issues
 */

const fs = require('fs');
const path = require('path');

class StaticCodeAnalyzer {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    this.metrics = {
      totalLines: 0,
      totalFiles: 0,
      complexity: 0
    };
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
    console.log(`[${severity.toUpperCase()}] ${title}: ${description}`);
  }

  async analyzeDirectory(dirPath) {
    const files = this.getAllFiles(dirPath, ['.ts', '.tsx', '.js', '.jsx']);

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('.next') || file.includes('.vercel')) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      this.analyzeFile(file, content);
      this.metrics.totalFiles++;
      this.metrics.totalLines += content.split('\n').length;
    }
  }

  getAllFiles(dirPath, extensions) {
    let files = [];

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!['node_modules', '.next', '.git', '.vercel'].includes(item)) {
            files = files.concat(this.getAllFiles(fullPath, extensions));
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error.message);
    }

    return files;
  }

  analyzeFile(filePath, content) {
    const filename = path.basename(filePath);
    const lines = content.split('\n');

    // Security Analysis
    this.checkSecurityIssues(filePath, content, filename);

    // Performance Analysis
    this.checkPerformanceIssues(filePath, content, filename);

    // Code Quality Analysis
    this.checkCodeQuality(filePath, content, filename, lines);

    // TypeScript/JavaScript specific checks
    this.checkJavaScriptIssues(filePath, content, filename);

    // React specific checks
    if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
      this.checkReactIssues(filePath, content, filename);
    }

    // API route specific checks
    if (filePath.includes('/api/')) {
      this.checkAPIIssues(filePath, content, filename);
    }
  }

  checkSecurityIssues(filePath, content, filename) {
    // Check for dangerous functions
    const dangerousFunctions = [
      { pattern: /eval\s*\(/g, issue: 'eval() usage', severity: 'critical' },
      { pattern: /Function\s*\(/g, issue: 'Function() constructor usage', severity: 'critical' },
      { pattern: /innerHTML\s*=/g, issue: 'innerHTML assignment', severity: 'high' },
      { pattern: /document\.write\s*\(/g, issue: 'document.write() usage', severity: 'high' },
      { pattern: /dangerouslySetInnerHTML/g, issue: 'dangerouslySetInnerHTML usage', severity: 'medium' }
    ];

    dangerousFunctions.forEach(check => {
      const matches = content.match(check.pattern);
      if (matches) {
        this.addFinding(check.severity, 'security', `Dangerous Function: ${check.issue}`,
          `File ${filename} uses ${check.issue} which can lead to security vulnerabilities`,
          { file: filePath, occurrences: matches.length });
      }
    });

    // Check for hardcoded secrets
    const secretPatterns = [
      { pattern: /(?:password|pwd|secret|key|token|auth)\s*[:=]\s*["'][^"']{8,}["']/gi, type: 'Hardcoded Credentials' },
      { pattern: /[A-Za-z0-9+/]{40,}={0,2}/g, type: 'Base64 Encoded Data' },
      { pattern: /sk_[a-zA-Z0-9]{20,}/g, type: 'API Key Pattern' },
      { pattern: /(?:api_key|apikey|access_token)\s*[:=]\s*["'][^"']{10,}["']/gi, type: 'API Key' }
    ];

    secretPatterns.forEach(check => {
      const matches = content.match(check.pattern);
      if (matches && matches.length > 0) {
        // Filter out obvious false positives
        const filtered = matches.filter(match =>
          !match.includes('example') &&
          !match.includes('placeholder') &&
          !match.includes('test') &&
          !match.includes('TODO')
        );

        if (filtered.length > 0) {
          this.addFinding('critical', 'security', `Potential ${check.type}`,
            `File ${filename} may contain hardcoded sensitive information`,
            { file: filePath, type: check.type, count: filtered.length });
        }
      }
    });

    // Check for SQL injection vulnerabilities
    if (content.includes('prepare(') && content.includes('${')) {
      this.addFinding('high', 'security', 'SQL Injection Risk',
        `File ${filename} uses string interpolation with SQL prepare statements`,
        { file: filePath });
    }

    // Check for improper URL validation
    if (content.includes('new URL(') && !content.includes('try')) {
      this.addFinding('medium', 'security', 'Unvalidated URL Construction',
        `File ${filename} constructs URLs without proper error handling`,
        { file: filePath });
    }
  }

  checkPerformanceIssues(filePath, content, filename) {
    // Check for inefficient patterns
    const performanceIssues = [
      { pattern: /for\s*\([^)]+\)\s*{\s*for\s*\([^)]+\)/g, issue: 'Nested loops', severity: 'medium' },
      { pattern: /document\.querySelector.*inside.*for/g, issue: 'DOM queries in loops', severity: 'medium' },
      { pattern: /JSON\.parse\(JSON\.stringify/g, issue: 'Deep clone via JSON', severity: 'low' },
      { pattern: /forEach\([^)]*await/g, issue: 'await in forEach', severity: 'high' }
    ];

    performanceIssues.forEach(check => {
      const matches = content.match(check.pattern);
      if (matches) {
        this.addFinding(check.severity, 'performance', `Performance Issue: ${check.issue}`,
          `File ${filename} contains performance anti-pattern: ${check.issue}`,
          { file: filePath, occurrences: matches.length });
      }
    });

    // Check for large bundle imports
    const largeImports = content.match(/import.*from\s+["'][^"']*["']/g) || [];
    const lodashImports = largeImports.filter(imp => imp.includes('lodash') && !imp.includes('lodash/'));
    if (lodashImports.length > 0) {
      this.addFinding('medium', 'performance', 'Large Library Import',
        `File ${filename} imports entire lodash library instead of specific functions`,
        { file: filePath, imports: lodashImports });
    }

    // Check for synchronous file operations
    const syncOps = [
      'readFileSync', 'writeFileSync', 'existsSync', 'statSync'
    ];

    syncOps.forEach(op => {
      if (content.includes(op) && !filePath.includes('test') && !filePath.includes('build')) {
        this.addFinding('medium', 'performance', `Synchronous File Operation: ${op}`,
          `File ${filename} uses synchronous file operation which can block the event loop`,
          { file: filePath, operation: op });
      }
    });
  }

  checkCodeQuality(filePath, content, filename, lines) {
    // Check for code complexity indicators
    const complexityIndicators = [
      { pattern: /if\s*\(/g, weight: 1 },
      { pattern: /else\s+if/g, weight: 1 },
      { pattern: /switch\s*\(/g, weight: 2 },
      { pattern: /for\s*\(/g, weight: 2 },
      { pattern: /while\s*\(/g, weight: 2 },
      { pattern: /catch\s*\(/g, weight: 1 }
    ];

    let complexity = 0;
    complexityIndicators.forEach(indicator => {
      const matches = content.match(indicator.pattern) || [];
      complexity += matches.length * indicator.weight;
    });

    this.metrics.complexity += complexity;

    if (complexity > 20) {
      this.addFinding('medium', 'code-quality', 'High Complexity',
        `File ${filename} has high cyclomatic complexity (${complexity})`,
        { file: filePath, complexity });
    }

    // Check for long functions
    const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*{|=>\s*{|\w+\s*\([^)]*\)\s*{/g) || [];
    if (functionMatches.length > 0) {
      // Simple heuristic: count lines between function start and likely end
      const avgLinesPerFunction = lines.length / functionMatches.length;
      if (avgLinesPerFunction > 50) {
        this.addFinding('low', 'code-quality', 'Long Functions',
          `File ${filename} may contain functions that are too long`,
          { file: filePath, avgLines: Math.round(avgLinesPerFunction) });
      }
    }

    // Check for TODO/FIXME comments
    const todoPattern = /(TODO|FIXME|XXX|HACK)/gi;
    const todos = content.match(todoPattern) || [];
    if (todos.length > 3) {
      this.addFinding('low', 'code-quality', 'Many TODO Comments',
        `File ${filename} contains ${todos.length} TODO/FIXME comments`,
        { file: filePath, count: todos.length });
    }

    // Check for console.log statements
    const consoleLogPattern = /console\.log\s*\(/g;
    const consoleLogs = content.match(consoleLogPattern) || [];
    if (consoleLogs.length > 2 && !filePath.includes('test')) {
      this.addFinding('low', 'code-quality', 'Console Log Statements',
        `File ${filename} contains ${consoleLogs.length} console.log statements`,
        { file: filePath, count: consoleLogs.length });
    }

    // Check for error handling
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
    const asyncFunctions = (content.match(/async\s+function|async\s*\(/g) || []).length;

    if (asyncFunctions > 0 && catchBlocks === 0) {
      this.addFinding('medium', 'code-quality', 'Missing Error Handling',
        `File ${filename} has async functions but no catch blocks for error handling`,
        { file: filePath, asyncFunctions, catchBlocks });
    }
  }

  checkJavaScriptIssues(filePath, content, filename) {
    // Check for var usage (should use let/const)
    const varUsage = content.match(/\bvar\s+/g);
    if (varUsage && varUsage.length > 0) {
      this.addFinding('low', 'code-quality', 'var Usage',
        `File ${filename} uses 'var' instead of 'let' or 'const'`,
        { file: filePath, occurrences: varUsage.length });
    }

    // Check for == instead of ===
    const looseEquality = content.match(/[^!=]==[^=]/g);
    if (looseEquality && looseEquality.length > 0) {
      this.addFinding('low', 'code-quality', 'Loose Equality',
        `File ${filename} uses '==' instead of '==='`,
        { file: filePath, occurrences: looseEquality.length });
    }

    // Check for missing semicolons (basic check)
    const lines = content.split('\n');
    let missingSemicolons = 0;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed &&
          !trimmed.endsWith(';') &&
          !trimmed.endsWith('{') &&
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*') &&
          !trimmed.includes('import ') &&
          !trimmed.includes('export ') &&
          trimmed.length > 5) {
        missingSemicolons++;
      }
    });

    if (missingSemicolons > 5) {
      this.addFinding('low', 'code-quality', 'Missing Semicolons',
        `File ${filename} may be missing semicolons in ${missingSemicolons} places`,
        { file: filePath, count: missingSemicolons });
    }
  }

  checkReactIssues(filePath, content, filename) {
    // Check for missing key props in lists
    if (content.includes('.map(') && !content.includes('key=')) {
      this.addFinding('medium', 'react', 'Missing Key Props',
        `File ${filename} uses .map() without key props`,
        { file: filePath });
    }

    // Check for inline object/function definitions in JSX
    const inlineObjectPattern = /\w+\s*=\s*{{[^}]+}}/g;
    const inlineObjects = content.match(inlineObjectPattern) || [];
    if (inlineObjects.length > 2) {
      this.addFinding('low', 'performance', 'Inline Objects in JSX',
        `File ${filename} has inline object definitions in JSX which cause re-renders`,
        { file: filePath, count: inlineObjects.length });
    }

    // Check for useEffect without dependency array
    if (content.includes('useEffect(') && !content.includes(', [')) {
      this.addFinding('high', 'react', 'useEffect without Dependencies',
        `File ${filename} has useEffect without dependency array`,
        { file: filePath });
    }

    // Check for direct state mutation
    if (content.includes('useState') && content.includes('.push(')) {
      this.addFinding('medium', 'react', 'Direct State Mutation',
        `File ${filename} may be directly mutating state arrays`,
        { file: filePath });
    }
  }

  checkAPIIssues(filePath, content, filename) {
    // Check for missing rate limiting
    if (!content.includes('rateLimiters') && !content.includes('rateLimit')) {
      this.addFinding('medium', 'api', 'Missing Rate Limiting',
        `API route ${filename} lacks rate limiting`,
        { file: filePath });
    }

    // Check for missing input validation
    if (!content.includes('validate') && !content.includes('schema') && content.includes('request.json()')) {
      this.addFinding('medium', 'api', 'Missing Input Validation',
        `API route ${filename} may lack proper input validation`,
        { file: filePath });
    }

    // Check for missing error handling in API routes
    if (!content.includes('try') || !content.includes('catch')) {
      this.addFinding('high', 'api', 'Missing Error Handling',
        `API route ${filename} lacks proper error handling`,
        { file: filePath });
    }

    // Check for CORS issues
    if (!content.includes('Access-Control') && !content.includes('cors')) {
      this.addFinding('low', 'api', 'No CORS Configuration',
        `API route ${filename} doesn't configure CORS headers`,
        { file: filePath });
    }

    // Check for sensitive data in logs
    if (content.includes('console.log') && (content.includes('password') || content.includes('token'))) {
      this.addFinding('high', 'security', 'Sensitive Data in Logs',
        `API route ${filename} may log sensitive information`,
        { file: filePath });
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
        lowIssues: this.findings.low.length,
        metrics: this.metrics
      },
      findings: this.findings
    };

    console.log('\n=== STATIC CODE ANALYSIS REPORT ===');
    console.log(`Total Files Analyzed: ${this.metrics.totalFiles}`);
    console.log(`Total Lines of Code: ${this.metrics.totalLines}`);
    console.log(`Average Complexity: ${Math.round(this.metrics.complexity / this.metrics.totalFiles)}`);
    console.log(`Total Findings: ${totalFindings}`);
    console.log(`Critical: ${this.findings.critical.length}`);
    console.log(`High: ${this.findings.high.length}`);
    console.log(`Medium: ${this.findings.medium.length}`);
    console.log(`Low: ${this.findings.low.length}`);

    return report;
  }

  async run() {
    console.log('Starting static code analysis...');
    await this.analyzeDirectory('/home/lando555/amway-imagen');
    return this.generateReport();
  }
}

// Run the analyzer
async function main() {
  const analyzer = new StaticCodeAnalyzer();

  try {
    const report = await analyzer.run();

    // Write detailed report
    fs.writeFileSync('/home/lando555/amway-imagen/static-analysis-report.json',
                     JSON.stringify(report, null, 2));

    console.log('\nDetailed report saved to: static-analysis-report.json');

  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = { StaticCodeAnalyzer };
}