import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseManager } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;
    const CAMPAIGN_STORAGE = env.CAMPAIGN_STORAGE as R2Bucket | undefined;

    if (!DB) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const dbManager = new DatabaseManager(DB);

    // Get hours parameter from request (default 24)
    const body = await request.json().catch(() => ({ hours: 24 })) as { hours?: number };
    const hours = body.hours || 24;

    // Run cleanup with R2 deletion
    const result = await dbManager.cleanupFailedCampaigns(CAMPAIGN_STORAGE, hours);

    return NextResponse.json({
      success: true,
      deletedCampaigns: result.deleted,
      deletedImages: result.imagesDeleted,
      message: `Cleaned up ${result.deleted} campaigns and ${result.imagesDeleted} R2 images`
    });

  } catch (error: any) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
}
