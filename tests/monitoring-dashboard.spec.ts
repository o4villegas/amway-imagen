/**
 * Real-time Monitoring Dashboard Test
 * Continuous monitoring with live error detection and remediation
 */

import { test, expect } from '@playwright/test';
import { TestOrchestrator } from './e2e-framework/test-orchestrator';
import { ErrorDetector } from './e2e-framework/error-detector';
import { AutoRemediator } from './e2e-framework/auto-remediator';

interface MonitoringMetrics {
  uptime: number;
  errorRate: number;
  responseTime: number;
  autoFixSuccessRate: number;
  criticalIssues: number;
  timestamp: number;
}

class MonitoringDashboard {
  private metrics: MonitoringMetrics[] = [];
  private startTime = Date.now();
  private errorDetector: ErrorDetector;
  private autoRemediator: AutoRemediator;

  constructor(page: any) {
    this.errorDetector = new ErrorDetector(page);
    this.autoRemediator = new AutoRemediator(page);
  }

  async collectMetrics(page: any): Promise<MonitoringMetrics> {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Detect current errors
    const [uiErrors, perfErrors, a11yErrors, secErrors] = await Promise.all([
      this.errorDetector.detectUIErrors(),
      this.errorDetector.detectPerformanceErrors(),
      this.errorDetector.detectAccessibilityErrors(),
      this.errorDetector.detectSecurityErrors()
    ]);

    const allErrors = [...uiErrors, ...perfErrors, ...a11yErrors, ...secErrors];
    const criticalIssues = allErrors.filter(e => e.severity === 'critical').length;

    // Measure response time
    const responseTimeStart = Date.now();
    try {
      await page.goto('/campaign/new', { waitUntil: 'domcontentloaded' });
      const responseTime = Date.now() - responseTimeStart;

      // Calculate error rate (errors per minute)
      const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute
      const totalErrors = recentMetrics.reduce((sum, m) => sum + m.criticalIssues, 0) + criticalIssues;
      const errorRate = totalErrors; // Per minute

      // Auto-fix success rate
      const autoFixSuccessRate = this.calculateAutoFixSuccessRate();

      const metrics: MonitoringMetrics = {
        uptime,
        errorRate,
        responseTime,
        autoFixSuccessRate,
        criticalIssues,
        timestamp: now
      };

      this.metrics.push(metrics);

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      return metrics;
    } catch (error) {
      return {
        uptime,
        errorRate: 100, // Max error rate if page won't load
        responseTime: 30000, // Timeout
        autoFixSuccessRate: 0,
        criticalIssues: 1,
        timestamp: now
      };
    }
  }

  private calculateAutoFixSuccessRate(): number {
    // This would track actual auto-fix attempts and successes
    // For now, return a calculated estimate
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 100;

    const avgCriticalIssues = recentMetrics.reduce((sum, m) => sum + m.criticalIssues, 0) / recentMetrics.length;
    return Math.max(0, 100 - (avgCriticalIssues * 20)); // Rough calculation
  }

  getHealthScore(): number {
    if (this.metrics.length === 0) return 100;

    const latest = this.metrics[this.metrics.length - 1];
    let score = 100;

    // Deduct points for issues
    score -= latest.criticalIssues * 20; // -20 per critical issue
    score -= Math.min(latest.errorRate * 2, 40); // -2 per error, max -40
    score -= Math.min((latest.responseTime - 1000) / 100, 20); // -1 per 100ms over 1s, max -20
    score -= (100 - latest.autoFixSuccessRate) * 0.2; // Small penalty for poor auto-fix rate

    return Math.max(0, Math.min(100, score));
  }

  getMetricsTrend(metric: keyof MonitoringMetrics, minutes: number = 5): number[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics
      .filter(m => m.timestamp >= cutoff)
      .map(m => m[metric] as number);
  }

  generateAlert(): { severity: 'low' | 'medium' | 'high' | 'critical'; message: string } | null {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return null;

    if (latest.criticalIssues > 0) {
      return {
        severity: 'critical',
        message: `${latest.criticalIssues} critical issues detected requiring immediate attention`
      };
    }

    if (latest.responseTime > 10000) {
      return {
        severity: 'high',
        message: `Extremely slow response time: ${latest.responseTime}ms`
      };
    }

    if (latest.errorRate > 10) {
      return {
        severity: 'high',
        message: `High error rate: ${latest.errorRate} errors per minute`
      };
    }

    if (latest.autoFixSuccessRate < 50) {
      return {
        severity: 'medium',
        message: `Low auto-fix success rate: ${latest.autoFixSuccessRate}%`
      };
    }

    if (latest.responseTime > 5000) {
      return {
        severity: 'medium',
        message: `Slow response time: ${latest.responseTime}ms`
      };
    }

    const healthScore = this.getHealthScore();
    if (healthScore < 70) {
      return {
        severity: 'low',
        message: `System health below threshold: ${healthScore}%`
      };
    }

    return null;
  }

  async performHealthCheck(page: any): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    details: string[];
    remediationAttempted: boolean;
  }> {
    const details: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let remediationAttempted = false;

    try {
      // 1. Basic connectivity check
      await page.goto('/campaign/new', { timeout: 10000 });
      details.push('✅ Basic connectivity: OK');

      // 2. Essential elements check
      const criticalElements = [
        { selector: 'h1', name: 'Main heading' },
        { selector: 'img[alt="Amway"]', name: 'Logo' },
        { selector: 'input[type="url"]', name: 'URL input' }
      ];

      for (const element of criticalElements) {
        const exists = await page.locator(element.selector).isVisible().catch(() => false);
        if (exists) {
          details.push(`✅ ${element.name}: OK`);
        } else {
          details.push(`❌ ${element.name}: Missing`);
          status = 'degraded';
        }
      }

      // 3. API endpoints check
      const apiChecks = [
        { endpoint: '/api/scrape', method: 'POST', data: { url: 'test' } }
      ];

      for (const check of apiChecks) {
        try {
          const response = await page.request.post(check.endpoint, { data: check.data });
          if (response.status() < 500) {
            details.push(`✅ API ${check.endpoint}: OK`);
          } else {
            details.push(`⚠️ API ${check.endpoint}: Error ${response.status()}`);
            status = 'degraded';
          }
        } catch {
          details.push(`❌ API ${check.endpoint}: Unreachable`);
          status = 'critical';
        }
      }

      // 4. Performance check
      const performanceStart = Date.now();
      await page.reload();
      const loadTime = Date.now() - performanceStart;

      if (loadTime < 3000) {
        details.push(`✅ Performance: Good (${loadTime}ms)`);
      } else if (loadTime < 10000) {
        details.push(`⚠️ Performance: Slow (${loadTime}ms)`);
        status = status === 'healthy' ? 'degraded' : status;
      } else {
        details.push(`❌ Performance: Very slow (${loadTime}ms)`);
        status = 'critical';
      }

      // 5. Memory usage check
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (memoryInfo) {
        const usedMB = memoryInfo.used / 1024 / 1024;
        if (usedMB < 50) {
          details.push(`✅ Memory: Good (${usedMB.toFixed(1)}MB)`);
        } else if (usedMB < 100) {
          details.push(`⚠️ Memory: High (${usedMB.toFixed(1)}MB)`);
          status = status === 'healthy' ? 'degraded' : status;
        } else {
          details.push(`❌ Memory: Critical (${usedMB.toFixed(1)}MB)`);
          status = 'critical';
        }
      }

      // 6. Error detection
      const errors = await this.errorDetector.detectUIErrors();
      if (errors.length === 0) {
        details.push('✅ UI Errors: None detected');
      } else {
        const criticalErrors = errors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
          details.push(`❌ UI Errors: ${criticalErrors.length} critical`);
          status = 'critical';

          // Attempt auto-remediation for critical errors
          details.push('🔧 Attempting auto-remediation...');
          const remediationResults = await this.autoRemediator.remediateAll(criticalErrors);
          const successfulFixes = remediationResults.filter(r => r.success).length;

          if (successfulFixes > 0) {
            details.push(`✅ Auto-remediation: ${successfulFixes}/${criticalErrors.length} fixed`);
            remediationAttempted = true;

            if (successfulFixes === criticalErrors.length) {
              status = 'degraded'; // Improved from critical
            }
          } else {
            details.push('❌ Auto-remediation: Failed');
          }
        } else {
          details.push(`⚠️ UI Errors: ${errors.length} non-critical`);
          status = status === 'healthy' ? 'degraded' : status;
        }
      }

    } catch (error: any) {
      details.push(`❌ Health check failed: ${error.message}`);
      status = 'critical';
    }

    return { status, details, remediationAttempted };
  }
}

test.describe('Continuous Monitoring Dashboard', () => {
  let dashboard: MonitoringDashboard;

  test.beforeEach(async ({ page }) => {
    dashboard = new MonitoringDashboard(page);
  });

  test('Continuous System Health Monitoring', async ({ page }) => {
    const monitoringDuration = 60000; // 1 minute of monitoring
    const checkInterval = 10000; // Check every 10 seconds
    const startTime = Date.now();

    console.log('🎯 Starting continuous monitoring...');

    while (Date.now() - startTime < monitoringDuration) {
      const metrics = await dashboard.collectMetrics(page);
      const healthScore = dashboard.getHealthScore();
      const alert = dashboard.generateAlert();

      console.log(`📊 Health Score: ${healthScore.toFixed(1)}% | Response: ${metrics.responseTime}ms | Errors: ${metrics.criticalIssues}`);

      if (alert) {
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);

        if (alert.severity === 'critical' || alert.severity === 'high') {
          // Perform immediate health check and remediation
          const healthCheck = await dashboard.performHealthCheck(page);
          console.log(`🏥 Health Check: ${healthCheck.status.toUpperCase()}`);
          healthCheck.details.forEach(detail => console.log(`   ${detail}`));

          if (healthCheck.remediationAttempted) {
            console.log('🔧 Auto-remediation was attempted');
          }
        }
      }

      // Wait before next check
      await page.waitForTimeout(checkInterval);
    }

    console.log('✅ Monitoring completed');

    // Final health assessment
    const finalHealthScore = dashboard.getHealthScore();
    expect(finalHealthScore).toBeGreaterThan(50); // System should maintain at least 50% health
  });

  test('Stress Test with Real-time Recovery', async ({ page }) => {
    console.log('💪 Starting stress test with monitoring...');

    // Simulate various stress conditions
    const stressTests = [
      {
        name: 'Rapid Navigation',
        action: async () => {
          for (let i = 0; i < 10; i++) {
            await page.goto('/campaign/new');
            await page.waitForTimeout(500);
          }
        }
      },
      {
        name: 'Rapid Form Interactions',
        action: async () => {
          await page.goto('/campaign/new');
          for (let i = 0; i < 20; i++) {
            await page.fill('input[type="url"]', `https://www.amway.com/en_US/p-${i}`);
            await page.waitForTimeout(100);
          }
        }
      },
      {
        name: 'Memory Stress',
        action: async () => {
          await page.goto('/campaign/new');
          // Create many DOM elements to stress memory
          await page.evaluate(() => {
            for (let i = 0; i < 1000; i++) {
              const div = document.createElement('div');
              div.innerHTML = `Stress test element ${i}`;
              document.body.appendChild(div);
            }
          });
        }
      }
    ];

    for (const stressTest of stressTests) {
      console.log(`🔨 Running stress test: ${stressTest.name}`);

      // Collect baseline metrics
      const baselineMetrics = await dashboard.collectMetrics(page);
      console.log(`   Baseline health: ${dashboard.getHealthScore().toFixed(1)}%`);

      // Run stress test
      await stressTest.action();

      // Monitor recovery
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(2000);
        const metrics = await dashboard.collectMetrics(page);
        const healthScore = dashboard.getHealthScore();

        console.log(`   Recovery check ${i + 1}: ${healthScore.toFixed(1)}% health`);

        const alert = dashboard.generateAlert();
        if (alert && (alert.severity === 'critical' || alert.severity === 'high')) {
          console.log(`   🚨 ${alert.message}`);

          // Trigger auto-remediation
          const healthCheck = await dashboard.performHealthCheck(page);
          if (healthCheck.remediationAttempted) {
            console.log(`   🔧 Auto-remediation attempted: ${healthCheck.status}`);
          }
        }

        // If health recovers above 70%, consider stress test passed
        if (healthScore > 70) {
          console.log(`   ✅ System recovered successfully`);
          break;
        }
      }
    }

    // Final system state should be stable
    const finalHealth = dashboard.getHealthScore();
    console.log(`🏁 Final system health: ${finalHealth.toFixed(1)}%`);

    expect(finalHealth).toBeGreaterThan(60); // Should recover to reasonable health
  });

  test('Error Injection and Auto-Recovery', async ({ page }) => {
    console.log('🎯 Testing error injection and recovery...');

    // Baseline health check
    let healthCheck = await dashboard.performHealthCheck(page);
    console.log(`📊 Baseline health: ${healthCheck.status}`);

    const errorScenarios = [
      {
        name: 'API Failure',
        setup: async () => {
          await page.route('**/api/scrape', route => route.abort('failed'));
        },
        trigger: async () => {
          await page.goto('/campaign/new');
          await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123456');
          await page.click('button[type="submit"]');
        }
      },
      {
        name: 'Slow API Response',
        setup: async () => {
          await page.route('**/api/scrape', async route => {
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
            await route.continue();
          });
        },
        trigger: async () => {
          await page.goto('/campaign/new');
          await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-789012');
          await page.click('button[type="submit"]');
        }
      },
      {
        name: 'Malformed Response',
        setup: async () => {
          await page.route('**/api/scrape', route => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: 'invalid json{'
            });
          });
        },
        trigger: async () => {
          await page.goto('/campaign/new');
          await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-345678');
          await page.click('button[type="submit"]');
        }
      }
    ];

    for (const scenario of errorScenarios) {
      console.log(`🧪 Testing scenario: ${scenario.name}`);

      // Set up error condition
      await scenario.setup();

      // Trigger the error
      await scenario.trigger();

      // Monitor system response and auto-recovery
      let recovered = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        await page.waitForTimeout(5000);

        healthCheck = await dashboard.performHealthCheck(page);
        console.log(`   Attempt ${attempt + 1}: ${healthCheck.status}`);

        if (healthCheck.status === 'healthy' || healthCheck.status === 'degraded') {
          recovered = true;
          console.log(`   ✅ System recovered from ${scenario.name}`);
          break;
        }

        if (healthCheck.remediationAttempted) {
          console.log(`   🔧 Auto-remediation applied`);
        }
      }

      if (!recovered) {
        console.log(`   ⚠️ System did not fully recover from ${scenario.name}`);
      }

      // Clear routes for next scenario
      await page.unroute('**/api/scrape');
      await page.waitForTimeout(2000);
    }

    // Final verification
    healthCheck = await dashboard.performHealthCheck(page);
    console.log(`🏁 Final system state: ${healthCheck.status}`);

    expect(['healthy', 'degraded']).toContain(healthCheck.status);
  });

  test('Long-term Stability Monitoring', async ({ page }) => {
    console.log('⏰ Starting long-term stability test...');

    const testDuration = 2 * 60 * 1000; // 2 minutes
    const checkInterval = 15000; // Every 15 seconds
    const startTime = Date.now();

    const healthHistory: number[] = [];
    let totalChecks = 0;
    let healthyChecks = 0;

    while (Date.now() - startTime < testDuration) {
      totalChecks++;

      // Simulate normal user activity
      await page.goto('/campaign/new');
      await page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(1000);

      // Collect metrics
      const metrics = await dashboard.collectMetrics(page);
      const healthScore = dashboard.getHealthScore();
      healthHistory.push(healthScore);

      if (healthScore > 80) {
        healthyChecks++;
      }

      console.log(`🔄 Check ${totalChecks}: Health ${healthScore.toFixed(1)}% | Response ${metrics.responseTime}ms`);

      // Check for trends
      if (healthHistory.length >= 3) {
        const recentHealth = healthHistory.slice(-3);
        const declining = recentHealth.every((score, i) => i === 0 || score < recentHealth[i - 1]);

        if (declining && healthScore < 60) {
          console.log(`⚠️ Declining health trend detected, performing health check...`);
          const healthCheck = await dashboard.performHealthCheck(page);

          if (healthCheck.remediationAttempted) {
            console.log(`🔧 Proactive remediation applied`);
          }
        }
      }

      await page.waitForTimeout(checkInterval);
    }

    // Calculate stability metrics
    const averageHealth = healthHistory.reduce((sum, score) => sum + score, 0) / healthHistory.length;
    const healthyPercentage = (healthyChecks / totalChecks) * 100;

    console.log(`📈 Stability Report:`);
    console.log(`   Total checks: ${totalChecks}`);
    console.log(`   Average health: ${averageHealth.toFixed(1)}%`);
    console.log(`   Healthy checks: ${healthyPercentage.toFixed(1)}%`);

    // System should maintain good health over time
    expect(averageHealth).toBeGreaterThan(70);
    expect(healthyPercentage).toBeGreaterThan(60);
  });
});