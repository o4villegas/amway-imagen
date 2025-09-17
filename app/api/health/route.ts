import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { checkDatabaseHealth } from '@/lib/db-utils';
import { getEnvVar } from '@/lib/env-utils';

export const runtime = 'edge';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    storage: boolean;
    ai: boolean;
  };
  environment: string;
  version?: string;
  uptime?: number;
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const ctx = getRequestContext();
  const env = ctx.env as any;

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      storage: false,
      ai: false
    },
    environment: getEnvVar('NODE_ENV', 'production'),
    version: '1.0.0',
    uptime: Date.now() - startTime
  };

  // Check database health
  if (env.DB) {
    try {
      healthStatus.services.database = await checkDatabaseHealth(env.DB);
    } catch (error) {
      healthStatus.services.database = false;
    }
  }

  // Check R2 storage health
  if (env.CAMPAIGN_STORAGE) {
    try {
      // Try to list with limit 1 to check if R2 is accessible
      await env.CAMPAIGN_STORAGE.list({ limit: 1 });
      healthStatus.services.storage = true;
    } catch (error) {
      healthStatus.services.storage = false;
    }
  }

  // Check AI service health
  if (env.AI) {
    try {
      // We can't easily test AI without using credits, so just check if binding exists
      healthStatus.services.ai = true;
    } catch (error) {
      healthStatus.services.ai = false;
    }
  }

  // Determine overall health status
  const criticalServices = [healthStatus.services.database, healthStatus.services.storage];
  const allHealthy = criticalServices.every(s => s);
  const someHealthy = criticalServices.some(s => s);

  if (allHealthy) {
    healthStatus.status = 'healthy';
  } else if (someHealthy) {
    healthStatus.status = 'degraded';
  } else {
    healthStatus.status = 'unhealthy';
  }

  // Return appropriate status code based on health
  const statusCode = healthStatus.status === 'healthy' ? 200 :
                     healthStatus.status === 'degraded' ? 503 : 500;

  return NextResponse.json(healthStatus, { status: statusCode });
}