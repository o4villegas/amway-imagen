import { NextRequest, NextResponse } from 'next/server';
// Cloudflare Workers context will be available via process.env
import { DatabaseManager } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string; imageId: string } }
) {
  try {
    // @ts-ignore - Cloudflare Workers bindings
    const CAMPAIGN_STORAGE = process.env.CAMPAIGN_STORAGE as R2Bucket | undefined;
    // @ts-ignore - Cloudflare Workers bindings
    const DB = process.env.DB as D1Database | undefined;

    if (!DB || !CAMPAIGN_STORAGE) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const dbManager = new DatabaseManager(DB);

    const campaignId = parseInt(params.campaignId);
    const imageId = parseInt(params.imageId);

    if (isNaN(campaignId) || isNaN(imageId)) {
      return NextResponse.json(
        { error: 'Invalid campaign or image ID' },
        { status: 400 }
      );
    }

    // Get image metadata from database
    const images = await dbManager.getCampaignImages(campaignId);
    const image = images.find(img => img.id === imageId);

    if (!image || !image.r2_path) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Fetch image from R2
    const r2Object = await CAMPAIGN_STORAGE.get(image.r2_path);

    if (!r2Object) {
      return NextResponse.json(
        { error: 'Image file not found in storage' },
        { status: 404 }
      );
    }

    // Stream the image
    const arrayBuffer = await r2Object.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${image.file_path || 'image.jpg'}"`,
      }
    });

  } catch (error: any) {
    console.error('Image preview error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve image' },
      { status: 500 }
    );
  }
}

// Update image selection
export async function PATCH(
  request: NextRequest,
  { params }: { params: { campaignId: string; imageId: string } }
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

    const { selected }: { selected: boolean } = await request.json();
    const imageId = parseInt(params.imageId);

    if (isNaN(imageId)) {
      return NextResponse.json(
        { error: 'Invalid image ID' },
        { status: 400 }
      );
    }

    // Update selection status
    await dbManager.updateImageSelection(imageId, selected);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update selection error:', error);

    return NextResponse.json(
      { error: 'Failed to update selection' },
      { status: 500 }
    );
  }
}