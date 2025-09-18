import { NextRequest, NextResponse } from 'next/server';
// Cloudflare Workers context will be available via process.env
import { DatabaseManager } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    // @ts-ignore - Cloudflare Workers bindings
    const DB = process.env.DB as D1Database | undefined;

    if (!DB) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const dbManager = new DatabaseManager(DB);

    const campaignId = parseInt(params.campaignId);

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Get all images for the campaign
    const images = await dbManager.getCampaignImages(campaignId);

    return NextResponse.json({
      campaignId,
      images: images.map(img => ({
        id: img.id,
        format: img.format,
        prompt: img.prompt,
        width: img.width,
        height: img.height,
        selected: img.selected,
        r2_path: img.r2_path,
        generated_at: img.generated_at
      }))
    });

  } catch (error: any) {
    console.error('Campaign images fetch error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch campaign images' },
      { status: 500 }
    );
  }
}