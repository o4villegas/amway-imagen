import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { DatabaseManager } from '@/lib/db';
import { PromptGenerator } from '@/lib/prompt-generator';
import { ZipCreator, CampaignFile, CampaignMetadata } from '@/lib/zip-creator';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { rateLimiters } from '@/lib/rate-limiter';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.generate.isAllowed(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many generation requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300'
          }
        }
      );
    }
    const context = getRequestContext();
    const { AI, CAMPAIGN_STORAGE, DB } = context.env;

    const { productId, preferences }: {
      productId: number;
      preferences: CampaignPreferences;
    } = await request.json();

    if (!productId || !preferences) {
      return NextResponse.json(
        { error: 'Product ID and preferences are required' },
        { status: 400 }
      );
    }

    const dbManager = new DatabaseManager(DB);

    // Get product information
    const product = await dbManager.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create campaign record
    const campaignId = await dbManager.createCampaign({
      product_id: productId,
      campaign_type: preferences.campaign_type,
      brand_style: preferences.brand_style,
      color_scheme: preferences.color_scheme,
      text_overlay: preferences.text_overlay,
      campaign_size: preferences.campaign_size,
      image_formats: preferences.image_formats,
      status: 'generating'
    });

    try {
      // Generate prompts
      const promptGenerator = new PromptGenerator();
      const imagePrompts = promptGenerator.generateCampaignPrompts(product, preferences);

      const generatedImages: CampaignFile[] = [];
      const maxConcurrent = 3; // Limit concurrent AI requests

      // Process images in batches
      for (let i = 0; i < imagePrompts.length; i += maxConcurrent) {
        const batch = imagePrompts.slice(i, i + maxConcurrent);

        const batchPromises = batch.map(async (prompt) => {
          try {
            const aiInput = {
              prompt: prompt.text,
              num_steps: 4, // Fast generation for MVP
              guidance: 7.5,
              width: prompt.width,
              height: prompt.height
            };

            console.log(`Generating image ${i + 1}: ${prompt.text.substring(0, 100)}...`);

            const response = await AI.run('@cf/black-forest-labs/flux-1-schnell', aiInput);

            if (!response || !response.image) {
              throw new Error('AI did not return image data');
            }

            // Convert base64 to ArrayBuffer
            const binaryString = atob(response.image);
            const imageBuffer = new ArrayBuffer(binaryString.length);
            const imageArray = new Uint8Array(imageBuffer);
            for (let j = 0; j < binaryString.length; j++) {
              imageArray[j] = binaryString.charCodeAt(j);
            }

            // Save to database
            const filename = `${prompt.format}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            await dbManager.saveGeneratedImage({
              campaign_id: campaignId,
              format: prompt.format,
              prompt: prompt.text,
              file_path: filename,
              width: prompt.width,
              height: prompt.height
            });

            return {
              filename: filename,
              content: imageBuffer,
              format: prompt.format
            } as CampaignFile;

          } catch (error) {
            console.error(`Failed to generate image for prompt: ${prompt.text.substring(0, 50)}...`, error);
            // Return null for failed generations - we'll filter these out
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const successfulImages = batchResults.filter((result): result is CampaignFile => result !== null);
        generatedImages.push(...successfulImages);

        console.log(`Batch ${Math.floor(i / maxConcurrent) + 1} completed: ${successfulImages.length}/${batch.length} successful`);
      }

      if (generatedImages.length === 0) {
        throw new Error('Failed to generate any images');
      }

      // Create ZIP file
      const zipCreator = new ZipCreator();
      const metadata: CampaignMetadata = {
        generated: new Date().toISOString(),
        totalImages: generatedImages.length,
        formats: Array.from(new Set(generatedImages.map(img => img.format))),
        product: {
          name: product.name,
          brand: product.brand || 'Amway',
          category: product.category
        },
        preferences: {
          campaign_type: preferences.campaign_type,
          brand_style: preferences.brand_style,
          campaign_size: preferences.campaign_size
        },
        usage: 'Created with Amway IBO Image Campaign Generator'
      };

      const zipBuffer = await zipCreator.createCampaignZip(generatedImages, metadata);

      // Upload to R2
      const campaignKey = `campaigns/${campaignId}_${Date.now()}.zip`;
      await CAMPAIGN_STORAGE.put(campaignKey, zipBuffer, {
        httpMetadata: {
          contentType: 'application/zip'
        },
        customMetadata: {
          campaignId: campaignId.toString(),
          productId: productId.toString(),
          totalImages: generatedImages.length.toString(),
          createdAt: Date.now().toString()
        }
      });

      // Generate download URL (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const downloadUrl = `/api/campaign/download/${campaignKey}`;

      // Update campaign with success
      await dbManager.updateCampaignStatus(campaignId, 'completed', downloadUrl, expiresAt);

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(true, generatedImages.length, generationTime);

      return NextResponse.json({
        success: true,
        campaignId,
        downloadUrl,
        expiresAt,
        totalImages: generatedImages.length,
        successfulImages: generatedImages.length,
        requestedImages: imagePrompts.length,
        generationTimeSeconds: generationTime
      });

    } catch (generationError: any) {
      console.error('Campaign generation failed:', generationError);

      // Update campaign with failure
      await dbManager.updateCampaignStatus(campaignId, 'failed');

      // Update stats
      const generationTime = (Date.now() - startTime) / 1000;
      await dbManager.updateCampaignStats(false, 0, generationTime);

      throw generationError;
    }

  } catch (error: any) {
    console.error('Campaign generation error:', error);

    // Provide helpful error messages
    if (error.message.includes('Failed to generate any images')) {
      return NextResponse.json(
        { error: 'AI image generation failed. Please try again with different preferences.' },
        { status: 503 }
      );
    }

    if (error.message.includes('Product not found')) {
      return NextResponse.json(
        { error: 'Product information not found. Please start over.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Campaign generation failed. Please try again later.' },
      { status: 500 }
    );
  }
}