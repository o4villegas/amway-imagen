import { NextRequest, NextResponse } from 'next/server';
// Cloudflare Workers context will be available via process.env


export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    // @ts-ignore - Cloudflare Workers bindings
    const CAMPAIGN_STORAGE = process.env.CAMPAIGN_STORAGE as R2Bucket | undefined;

    if (!CAMPAIGN_STORAGE) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Reconstruct the full key from the path segments
    // The path already includes "campaigns/" prefix, so join directly
    const campaignKey = params.key.join('/');

    // Downloading campaign

    // Get the ZIP file from R2
    const object = await CAMPAIGN_STORAGE.get(campaignKey);

    if (!object) {
      return NextResponse.json(
        { error: 'Campaign not found or has expired' },
        { status: 404 }
      );
    }

    // Check if the campaign has expired (24 hours)
    const metadata = object.customMetadata;
    if (metadata?.createdAt) {
      const createdAt = parseInt(metadata.createdAt);
      const now = Date.now();
      const hoursOld = (now - createdAt) / (1000 * 60 * 60);

      if (hoursOld > 24) {
        // Delete expired campaign
        await CAMPAIGN_STORAGE.delete(campaignKey);
        return NextResponse.json(
          { error: 'Campaign has expired and is no longer available' },
          { status: 410 }
        );
      }
    }

    // Stream the ZIP file
    const arrayBuffer = await object.arrayBuffer();

    // Generate a descriptive filename
    const productName = metadata?.productName || 'Amway_Product';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${productName.replace(/[^a-zA-Z0-9]/g, '_')}_Campaign_${timestamp}.zip`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('Download error:', error);

    return NextResponse.json(
      { error: 'Failed to download campaign. Please try again.' },
      { status: 500 }
    );
  }
}