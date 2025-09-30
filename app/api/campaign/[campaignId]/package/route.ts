import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseManager, GeneratedImage } from '@/lib/db';
import { ZipCreator, CampaignFile, CampaignMetadata } from '@/lib/zip-creator';
import { withTimeout, TIMEOUTS } from '@/lib/timeout-utils';
import { CAMPAIGN_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;
    const CAMPAIGN_STORAGE = env.CAMPAIGN_STORAGE as R2Bucket | undefined;

    if (!DB || !CAMPAIGN_STORAGE) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const campaignId = parseInt(params.campaignId);

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const dbManager = new DatabaseManager(DB);

    // Get campaign details
    const campaign = await dbManager.getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get all images for the campaign
    const allImages = await dbManager.getCampaignImages(campaignId);
    const selectedImages = allImages.filter(img => img.selected);

    if (selectedImages.length === 0) {
      return NextResponse.json(
        { error: 'No images selected for packaging' },
        { status: 400 }
      );
    }

    // Fetch image buffers from R2
    const imageFiles: CampaignFile[] = [];
    for (const img of selectedImages) {
      if (!img.r2_path) {
        console.error(`Image ${img.id} has no R2 path`);
        continue;
      }

      const r2Object = await CAMPAIGN_STORAGE.get(img.r2_path);

      if (!r2Object) {
        console.error(`Image not found in R2: ${img.r2_path}`);
        continue;
      }

      const buffer = await r2Object.arrayBuffer();
      // Extract filename from R2 path (last segment)
      const filename = img.r2_path.split('/').pop() || `${img.format}_${img.id}.jpg`;
      imageFiles.push({
        format: img.format,
        content: buffer,
        filename: filename
      });
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve images from storage' },
        { status: 500 }
      );
    }

    // Get product information for metadata
    const product = await dbManager.getProductById(campaign.product_id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product information not found' },
        { status: 404 }
      );
    }

    // Create campaign metadata
    const metadata: CampaignMetadata = {
      generated: new Date().toISOString(),
      totalImages: imageFiles.length,
      formats: Array.from(new Set(selectedImages.map(img => img.format))),
      product: {
        name: product.name,
        brand: product.brand || 'Amway',
        category: product.category
      },
      preferences: campaign.preferences || {
        campaign_type: campaign.campaign_type,
        brand_style: campaign.brand_style,
        campaign_size: campaign.campaign_size
      },
      usage: 'Created with Amway IBO Image Campaign Generator'
    };

    // Collect marketing copy for selected images
    const marketingCopyCollection = selectedImages
      .map(img => {
        if (!img.marketing_copy) return null;

        try {
          return {
            format: img.format,
            copy: JSON.parse(img.marketing_copy)
          };
        } catch (e) {
          console.error(`Failed to parse marketing copy for image ${img.id}:`, e);
          return null;
        }
      })
      .filter((item): item is { format: GeneratedImage['format']; copy: any } => item !== null);

    // Create ZIP file
    const zipCreator = new ZipCreator();
    const zipBuffer = await withTimeout(
      zipCreator.createCampaignZipWithCopy(imageFiles, metadata, marketingCopyCollection),
      TIMEOUTS.ZIP_CREATION,
      'ZIP file creation'
    );

    // Upload ZIP to R2
    const campaignKey = `campaigns/${campaignId}_${Date.now()}.zip`;
    await withTimeout(
      CAMPAIGN_STORAGE.put(campaignKey, zipBuffer, {
        httpMetadata: {
          contentType: 'application/zip'
        },
        customMetadata: {
          campaignId: campaignId.toString(),
          productId: campaign.product_id.toString(),
          totalImages: imageFiles.length.toString(),
          createdAt: Date.now().toString()
        }
      }),
      TIMEOUTS.R2_UPLOAD,
      'Campaign ZIP upload'
    );

    // Generate download URL with expiration
    const expiresAt = new Date(
      Date.now() + CAMPAIGN_CONFIG.DOWNLOAD_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();
    const downloadUrl = `/api/campaign/download/${campaignKey}`;

    // Update campaign with download URL and mark as completed
    await dbManager.updateCampaignStatus(campaignId, 'completed', downloadUrl, expiresAt);

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresAt,
      totalImages: imageFiles.length
    });

  } catch (error: any) {
    console.error('Campaign packaging failed:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign package', details: error.message },
      { status: 500 }
    );
  }
}