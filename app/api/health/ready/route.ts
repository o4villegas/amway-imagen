import { NextRequest, NextResponse } from 'next/server';
// Cloudflare Workers context will be available via process.env


/**
 * Readiness probe - checks if the app is ready to serve traffic
 */
export async function GET(request: NextRequest) {
  // @ts-ignore - Cloudflare Workers bindings
  const DB = process.env.DB as D1Database | undefined;
  // @ts-ignore - Cloudflare Workers bindings
  const CAMPAIGN_STORAGE = process.env.CAMPAIGN_STORAGE as R2Bucket | undefined;
  // @ts-ignore - Cloudflare Workers bindings
  const AI = process.env.AI as Ai | undefined;

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