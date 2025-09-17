import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

/**
 * Readiness probe - checks if the app is ready to serve traffic
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext();
  const env = ctx.env as any;

  // Check if required environment bindings are present
  const checks = {
    database: !!env.DB,
    storage: !!env.CAMPAIGN_STORAGE,
    ai: !!env.AI,
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