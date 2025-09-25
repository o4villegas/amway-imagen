import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// This API route is dynamic and should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * Readiness probe - checks if the app is ready to serve traffic
 */
export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;
  const CAMPAIGN_STORAGE = env.CAMPAIGN_STORAGE as R2Bucket | undefined;
  const AI = env.AI as Ai | undefined;

  // Check if required environment bindings are present
  const checks = {
    database: !!DB,
    storage: !!CAMPAIGN_STORAGE,
    ai: !!AI,
    timestamp: new Date().toISOString()
  };

  const isReady = checks.database && checks.storage && checks.ai;

  return NextResponse.json(
    {
      ready: isReady,
      checks,
      message: isReady ? 'Application is ready' : 'Application is not ready'
    },
    { status: isReady ? 200 : 503 }
  );
}